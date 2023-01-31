const sql = require('mssql')
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
const axios = require('axios')
const twilio = require('twilio')
// const test = require('../../test.json')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    // Create an authenticated client to access the Twilio REST API
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const {
      message = 'TEST-0002;3\nJOSE-002;5\nTEST-0003;2',
      cnpj_client,
      branch,
      from_number,
      to_number
    } = req.query
    console.log(req.query)

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

    console.log(message)

    const messageItems = message.split('\n').map((item) => item.split(';'))
    const budgetCodes = messageItems.map((item) => ({ id: item[0] }))

    console.log(budgetCodes)

    try {
      const client_data = await request.query(
        `
            SELECT
                    RTRIM(SA1.A1_COD) AS client_code,
                    RTRIM(SA1.A1_TABELA) AS client_table

            FROM    SA1010 AS SA1 WITH (NOLOCK)

            WHERE
                    ${branch_condition}
                    ${cnpj_client_condition}
                    SA1.A1_MSBLQL <> 1 AND
                    SA1.D_E_L_E_T_ = ''

            `
      )
      console.log(client_data.recordsets[0][0])

      const client_code = client_data.recordsets[0][0].client_code
      const client_table = client_data.recordsets[0][0].client_table
      console.log('client_code', client_code)
      console.log('client_table', client_table)

      const api = axios.create({
        baseURL: process.env.PROTHEUS_API
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
      console.log('access_token', access_token)

      if (access_token) {
        api.defaults.headers.authorization = `Bearer ${access_token}`
      }

      const { data: partNumbersData } = await api.get('partnumber', {
        params: {
          userlog: '000001',
          company: '01',
          branch: '0201'
        },
        data: {
          part_number: budgetCodes
        }
      })

      const partNumbers = partNumbersData.data.produto

      const budgetItems = partNumbers.map((partNumber) => {
        const item = messageItems.find(
          (item) => item[0] === partNumber.part_number
        )

        return {
          produto: partNumber.codigo,
          quantidade: Number(item[1]),
          tipo_operacao: '01',
          part_number: partNumber.part_number
        }
      })

      const { data: budget } = await api.post(
        '/orcamentovenda',
        {
          orcamento: [
            {
              codigo_cliente: client_code,
              loja_cliente: '01',
              condicao_pagamento: '006',
              natureza_financeira: '10102',
              vendedor1: '000000',
              supervisor: '',
              tabela: client_table === '' ? '007' : client_table,
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

      // Initialize S3 Client
      const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      })

      console.log('budget', budget)

      // const pdfBase64 = test.data.orcamentovenda[1].fileContent
      const pdfBase64 = budget.data.orcamentovenda[1].fileContent

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
        console.log(
          'Successfully created ' +
            params.Key +
            ' and uploaded it to ' +
            params.Bucket +
            '/' +
            params.Key
        )
        return results // For unit tests.
      }

      await updatePdfToS3()

      console.log(
        `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
      )

      // Send a message via whatsapp with the pdf
      if (from_number && to_number) {
        await client.messages
          .create({
            mediaUrl: [
              `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
            ],
            from: from_number,
            to: to_number
          })
          .then((message) => console.log(message.sid))
      }

      // This callback is what is returned in response to this function being invoked.
      // It's really important! E.g. you might respond with TWiML here for a voice or SMS response.
      // Or you might return JSON data to a studio flow. Don't forget it!
      return res.json({
        mediaUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
      })
    } catch (err) {
      // console.log('budget', err)
      console.log(err?.response?.status)
      console.log(err?.response?.data)

      if (from_number && to_number) {
        if (err?.response?.status === 503) {
          await client.messages
            .create({
              body: 'O nosso serviço está indisponivel no momento, por favor tente mais tarde',
              from: from_number,
              to: to_number
            })
            .then((message) => console.log(message.sid))
        } else {
          await client.messages
            .create({
              body: 'Houve um erro, por favor tente novamente',
              from: from_number,
              to: to_number
            })
            .then((message) => console.log(message.sid))
        }
      }

      res.status(err?.response?.status || 500)
      return res.json({
        error: {
          message: err?.response?.data?.message,
          log: err
        }
      })
    }
  }

  // async post(req, res) {
  //   const request = new sql.Request()

  //   // Create an authenticated client to access the Twilio REST API
  //   const client = twilio(
  //     process.env.TWILIO_ACCOUNT_SID,
  //     process.env.TWILIO_AUTH_TOKEN
  //   )

  //   const {
  //     message = 'TEST-0002;3\nJOSE-002;5\nTEST-0003;2',
  //     cnpj_client,
  //     branch,
  //     from_number,
  //     to_number
  //   } = req.body
  //   console.log(req.body)

  //   let cnpj_client_condition
  //   let branch_condition

  //   if (branch != null) {
  //     branch_condition = `SA1.A1_FILIAL IN ('${branch.slice(0, 2)}') AND`
  //   } else {
  //     branch_condition = ``
  //   }

  //   if (cnpj_client != null) {
  //     cnpj_client_condition = `SA1.A1_CGC IN ('${cnpj_client.trim()}') AND`
  //   } else {
  //     cnpj_client_condition = ``
  //   }

  //   console.log(message)

  //   const messageItems = message.split('\n').map((item) => item.split(';'))
  //   const budgetCodes = messageItems.map((item) => ({ id: item[0] }))

  //   console.log(budgetCodes)

  //   try {
  //     const client_data = await request.query(
  //       `
  //           SELECT
  //                   RTRIM(SA1.A1_COD) AS client_code

  //           FROM    SA1010 AS SA1 WITH (NOLOCK)

  //           WHERE
  //                   ${branch_condition}
  //                   ${cnpj_client_condition}
  //                   SA1.A1_MSBLQL <> 1 AND
  //                   SA1.D_E_L_E_T_ = ''

  //           `
  //     )

  //     const client_code = client_data.recordsets[0][0].client_code
  //     console.log(client_code)

  //     const api = axios.create({
  //       baseURL: process.env.PROTHEUS_API
  //     })

  //     const {
  //       data: { access_token }
  //     } = await api.post('api/oauth2/v1/token', null, {
  //       params: {
  //         grant_type: 'password',
  //         username: process.env.PROTHEUS_LOGIN_USERNAME,
  //         password: process.env.PROTHEUS_LOGIN_PASSWORD
  //       }
  //     })

  //     if (access_token) {
  //       api.defaults.headers.authorization = `Bearer ${access_token}`
  //     }

  //     const { data: partNumbersData } = await api.get('partnumber', {
  //       params: {
  //         userlog: '000001',
  //         company: '01',
  //         branch: '0201'
  //       },
  //       data: {
  //         part_number: budgetCodes
  //       }
  //     })

  //     const partNumbers = partNumbersData.data.produto

  //     const budgetItems = partNumbers.map((partNumber) => {
  //       const item = messageItems.find(
  //         (item) => item[0] === partNumber.part_number
  //       )

  //       return {
  //         produto: partNumber.codigo,
  //         quantidade: Number(item[1]),
  //         tipo_operacao: '01',
  //         part_number: partNumber.part_number
  //       }
  //     })

  //     const { data: budget } = await api.post(
  //       '/orcamentovenda',
  //       {
  //         orcamento: [
  //           {
  //             codigo_cliente: client_code,
  //             loja_cliente: '01',
  //             condicao_pagamento: '005',
  //             natureza_financeira: '10102',
  //             vendedor1: '000011',
  //             supervisor: '000001',
  //             tabela: '017',
  //             itens: budgetItems
  //           }
  //         ]
  //       },
  //       {
  //         params: {
  //           company: '01',
  //           branch
  //         }
  //       }
  //     )

  //     // Initialize S3 Client
  //     const s3Client = new S3Client({
  //       region: 'us-east-1',
  //       credentials: {
  //         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  //       }
  //     })

  //     console.log(budget)

  //     // const pdfBase64 = test.data.orcamentovenda[1].fileContent
  //     const pdfBase64 = budget.data.orcamentovenda[1].fileContent

  //     const pdf = Buffer.from(pdfBase64, 'base64')
  //     const filename = `budgets/orcamento-${crypto.randomUUID()}`
  //     const params = {
  //       Bucket: process.env.AWS_BUCKET_NAME,
  //       Key: `${filename}.pdf`,
  //       Body: pdf
  //     }

  //     const updatePdfToS3 = async () => {
  //       // Create an object and upload it to the Amazon S3 bucket.
  //       const results = await s3Client.send(new PutObjectCommand(params))
  //       console.log(
  //         'Successfully created ' +
  //           params.Key +
  //           ' and uploaded it to ' +
  //           params.Bucket +
  //           '/' +
  //           params.Key
  //       )
  //       return results // For unit tests.
  //     }

  //     await updatePdfToS3()

  //     console.log(
  //       `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
  //     )

  //     // Send a message via whatsapp with the pdf
  //     if (from_number && to_number) {
  //       await client.messages
  //         .create({
  //           mediaUrl: [
  //             `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
  //           ],
  //           from: from_number,
  //           to: to_number
  //         })
  //         .then((message) => console.log(message.sid))
  //     }

  //     // This callback is what is returned in response to this function being invoked.
  //     // It's really important! E.g. you might respond with TWiML here for a voice or SMS response.
  //     // Or you might return JSON data to a studio flow. Don't forget it!
  //     return res.json({
  //       mediaUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
  //     })
  //   } catch (err) {
  //     console.log(typeof err, err)

  //     if (from_number && to_number) {
  //       await client.messages
  //         .create({
  //           body: 'Houve um erro, por favor tente novamente',
  //           from: from_number,
  //           to: to_number
  //         })
  //         .then((message) => console.log(message.sid))
  //     }

  //     res.status(500)
  //     return res.json({
  //       error: {
  //         message: String(err)
  //       }
  //     })
  //   }
  // }
}
