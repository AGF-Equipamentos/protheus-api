const sql = require('mssql')
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
const axios = require('axios')
const twilio = require('twilio')
const Sentry = require('@sentry/node')
const Joi = require('joi')
const { format } = require('date-fns')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    // Create an authenticated client to access the Twilio REST API
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const {
      message = '',
      cnpj_client: raw_cnpj = '',
      branch,
      from_number,
      to_number,
      paymentCondition = '006',
      env = 'test'
    } = req.query
    const cnpj_client = raw_cnpj.replace(/[^0-9]/g, '')

    let cnpj_client_condition
    let branch_condition

    if (branch != null) {
      branch_condition = `SA1.A1_FILIAL IN ('${branch.slice(0, 2)}') AND`
    } else {
      branch_condition = ``
    }

    if (cnpj_client != null) {
      cnpj_client_condition = `SA1.A1_CGC IN ('${cnpj_client.trim()}') AND`
    } else {
      cnpj_client_condition = ``
    }

    let messageItems = message.split('\n').map((item) => ({
      partNumber: item.split(';')[0].toUpperCase(),
      qty: Number(item.split(';')[1])
    }))
    let budgetCodes = messageItems.map((item) => ({
      id: item.partNumber
    }))

    const schema = Joi.array().items(
      Joi.object({
        partNumber: Joi.string().required(),
        qty: Joi.number().min(1).integer().required()
      })
    )

    const { error } = schema.validate(messageItems)

    if (error) {
      res.status(400)
      return res.json({
        error: {
          message: 'The products are not in the correct format'
        }
      })
    }

    Sentry.setContext('budget', {
      message,
      budgetCodes: JSON.stringify(budgetCodes),
      paymentCondition
    })

    try {
      const client_data = await request.query(
        `
            SELECT
                    RTRIM(SA1.A1_COD) AS client_code,
                    RTRIM(SA1.A1_TABELA) AS client_table,
                    RTRIM(SA1.A1_CONTRIB) AS taxpayer,
                    RTRIM(SA1.A1_EST) AS clientState,
                    RTRIM(SA1.A1_LOJA) AS clientStore,
                    RTRIM(SA1.A1_VEND) AS seller

            FROM    SA1010 AS SA1 WITH (NOLOCK)

            WHERE
                    ${branch_condition}
                    ${cnpj_client_condition}
                    SA1.A1_MSBLQL <> 1 AND
                    SA1.D_E_L_E_T_ = ''

            `
      )

      const client_code = client_data.recordsets[0][0].client_code
      const client_table = client_data.recordsets[0][0].client_table || '007'
      const taxPayer = client_data.recordsets[0][0].taxpayer === '1'
      const clientState = client_data.recordsets[0][0].clientState
      const clientStore = client_data.recordsets[0][0].clientStore
      const seller = client_data.recordsets[0][0].seller

      Sentry.setContext('clientData', {
        clientData: client_data.recordsets[0][0]
      })

      const branchStateQuery = await request.query(
        `
        select M0_ESTENT as state
        from SYS_COMPANY
        where M0_CODFIL = ${branch}
        `
      )

      const branchState = branchStateQuery.recordsets[0][0].state

      let budgetPriceTable = client_table

      const tablesAssociation = [
        {
          innerState: '003',
          outState: '017'
        },
        {
          innerState: '007',
          outState: '025'
        },
        {
          innerState: '016',
          outState: '028'
        }
      ]

      const clientTableAssociation = tablesAssociation.find(
        (tableAssociation) => {
          return (
            tableAssociation.innerState === client_table ||
            tableAssociation.outState === client_table
          )
        }
      )

      if (branchState === clientState) {
        budgetPriceTable = clientTableAssociation.innerState
      } else if (client_table === '007' && !taxPayer) {
        budgetPriceTable = '007'
      } else {
        budgetPriceTable = clientTableAssociation.outState
      }

      Sentry.setContext('tableInfo', {
        clientTableAssociation,
        budgetPriceTable
      })

      const api = axios.create({
        baseURL:
          env === 'producao'
            ? process.env.PROTHEUS_API
            : process.env.PROTHEUS_API_TEST
      })

      const {
        data: { access_token }
      } = await api.post('api/oauth2/v1/token', null, {
        params: {
          grant_type: 'password',
          username: process.env.PROTHEUS_LOGIN_USERNAME,
          password: process.env.PROTHEUS_LOGIN_PASSWORD
        }
      })

      if (access_token) {
        api.defaults.headers.authorization = `Bearer ${access_token}`
      }

      const budgetItems = []

      const partNumberProtheusData = await request.query(
        `
            SELECT
                    RTRIM(SB1.B1_COD) AS part_number,
                    RTRIM(SB1.B1_COD) AS codigo
            FROM    SB1010 AS SB1 WITH (NOLOCK)
            WHERE
                    SB1.B1_COD IN ('${budgetCodes
                      .map((budget) => budget.id)
                      .join(`','`)}') AND
                    SB1.B1_FILIAL IN ('${branch.slice(0, 2)}') AND
                    SB1.D_E_L_E_T_ = ''
            `
      )

      const partNumberProtheus = partNumberProtheusData.recordsets[0]

      if (partNumberProtheus.length > 0) {
        messageItems.forEach((item) => {
          const partNumber = partNumberProtheus.find(
            (partNumber) => partNumber.part_number === item.partNumber
          )

          if (partNumber) {
            budgetItems.push({
              produto: partNumber.codigo,
              quantidade: item.qty,
              tipo_operacao: '01',
              part_number: partNumber.part_number
            })
          }
        })
      }

      const notFoundItems = []
      const tagFoundItems = []

      if (messageItems.length !== budgetItems.length) {
        messageItems = message.split('\n').map((item) => ({
          partNumber: item
            .split(';')[0]
            // remove caracteres especiais,
            // considerar YAH-23 e YAH23 a mesma coisa (solicitação do Alex)
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase(),
          qty: Number(item.split(';')[1])
        }))
        budgetCodes = messageItems.map((item) => ({
          id: item.partNumber
        }))

        const partNumbersData = await request.query(
          `
              SELECT
                      RTRIM(Z2_PARTNUM) AS part_number,
                      RTRIM(Z2_PRODUTO) AS codigo
              FROM    SZ2010 AS SZ2 WITH (NOLOCK)
              WHERE
                      Z2_FILIAL IN ('${branch.slice(0, 2)}') AND
                      D_E_L_E_T_ = ''
              `
        )
        const partNumbers = partNumbersData.recordsets[0].map((pn) => ({
          ...pn,
          part_number: pn.part_number.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        }))

        const partNumbersFound = []
        const budgetCodesArray = budgetCodes.map((bg) => bg.id)

        partNumbers.forEach((pn) => {
          if (budgetCodesArray.includes(pn.part_number)) {
            partNumbersFound.push(pn)
          }
        })

        if (partNumberProtheus.length === 0 && partNumbersFound.length === 0) {
          res.status(404)
          return res.json({
            error: {
              message: 'Product not found'
            }
          })
        }

        if (partNumbersFound.length > 0) {
          messageItems.forEach((item) => {
            const partNumbers = partNumbersFound.reduce((acc, partNumber) => {
              if (partNumber.part_number === item.partNumber) {
                acc.push(partNumber)
              }
              return acc
            }, [])

            const itemAlreadyFoundInProtheus = budgetItems.find(
              (budgetItem) =>
                budgetItem.produto
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase() === item.partNumber
            )

            if (!itemAlreadyFoundInProtheus && partNumbers.length > 0) {
              // adicionar todos os itens correspondentes no orçamento, foi solicitado
              // pelos casos com "MF" no final
              partNumbers.forEach((pn) =>
                budgetItems.push({
                  produto: pn.codigo,
                  quantidade: item.qty,
                  tipo_operacao: '01',
                  part_number: pn.part_number
                })
              )
              tagFoundItems.push(item)
            }
            if (!itemAlreadyFoundInProtheus && partNumbers.length === 0) {
              notFoundItems.push(item)
            }
          })
        }

        Sentry.setContext('partNumbers', {
          partNumbers: JSON.stringify(partNumbersFound)
        })
      }

      if (notFoundItems.length > 0) {
        const lastItem = await request.query(
          `
                SELECT TOP 1 R_E_C_N_O_ as recno
                FROM    SZ3010 AS SZ3 WITH (NOLOCK)
        ORDER BY R_E_C_N_O_ DESC
                `
        )
        let sequence = Number(lastItem.recordset[0].recno) + 1

        const today = new Date()

        for (const item of notFoundItems) {
          await request.query(
            `
                  INSERT INTO SZ3010 (
                    Z3_FILIAL, Z3_SEQUENC, Z3_DATA,
                    Z3_HORA,
                    Z3_PARNUMB, Z3_DETALHE, R_E_C_N_O_
                  )
                  VALUES (
                    '02',
                    '${sequence.toString().padStart(7, '0')}',
                    '${format(today, 'yyyyMMdd')}',
                    '${format(today, 'HH:mm:ss')}',
                    '${item.partNumber}',
                    'REGISTRO NÃO ENCONTRADO',
                    ${sequence}
                  )
                  `
          )
          sequence++
        }
      }

      Sentry.setContext('budgetItems', {
        budgetCodes: JSON.stringify(budgetCodes),
        partNumberProtheus: JSON.stringify(partNumberProtheus),
        budgetItems: JSON.stringify(budgetItems)
      })

      return res.json({
        budgetItems
      })

      const budgetResponse = await api.post(
        '/orcamentovenda',
        {
          orcamento: [
            {
              codigo_cliente: client_code,
              loja_cliente: clientStore,
              condicao_pagamento: paymentCondition,
              natureza_financeira: '10102',
              vendedor1: seller !== '' ? seller : '000000',
              supervisor: '',
              vendedor5: '000000',
              tabela: budgetPriceTable,
              itens: budgetItems
            }
          ]
        },
        {
          params: {
            company: '01',
            branch
          }
        }
      )

      Sentry.setContext('budgetResponse', {
        budgetStatus: budgetResponse?.status,
        budget: JSON.stringify(budgetResponse?.data)
      })

      if (budgetResponse?.status !== 201) {
        throw new Error('Error on generating budget')
      }
      const budget = budgetResponse.data

      Sentry.setContext('budgetResponse', {
        budget: JSON.stringify(budget)
      })

      // Initialize S3 Client
      const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      })

      const pdfBase64 = budget.orcamento.fileContent

      const pdf = Buffer.from(pdfBase64, 'base64')
      const filename = `budgets/orcamento-${crypto.randomUUID()}`
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${filename}.pdf`,
        Body: pdf
      }

      const updatePdfToS3 = async () => {
        // Create an object and upload it to the Amazon S3 bucket.
        const results = await s3Client.send(new PutObjectCommand(params))
        return results // For unit tests.
      }

      await updatePdfToS3()

      Sentry.setContext('budget', {
        linkAws: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
      })

      // Send a message via whatsapp with the pdf
      if (from_number && to_number) {
        await client.messages.create({
          mediaUrl: [
            `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
          ],
          from: from_number,
          to: to_number
        })
      }

      // This callback is what is returned in response to this function being invoked.
      // It's really important! E.g. you might respond with TWiML here for a voice or SMS response.
      // Or you might return JSON data to a studio flow. Don't forget it!
      return res.json({
        mediaUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
      })
    } catch (err) {
      if (from_number && to_number) {
        if (err?.response?.status === 503) {
          await client.messages.create({
            body: '(ERR003) - O nosso serviço está indisponível no momento, por favor tente mais tarde',
            from: from_number,
            to: to_number
          })
        } else {
          await client.messages.create({
            body: '(ERR004) - Houve um erro ao gerar o orçamento, consulte o suporte para mais informações.',
            from: from_number,
            to: to_number
          })
        }
      }

      Sentry.captureException(err)

      res.status(err?.response?.status || 400)
      return res.json({
        error: {
          error: err.message,
          message: err?.response?.data?.message,
          log: err
        }
      })
    }
  }
}
