const sql = require('mssql')
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
// const axios = require('axios')
const test = require('../../test.json')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()
    const {
      message = 'TEST-0002;3\nJOSE-002;5\nTEST-0003;2',
      cnpj_client,
      branch
    } = req.query

    let cnpj_client_condition
    let branch_condition

    if (branch != null) {
      branch_condition = `SA1.A1_FILIAL IN ('${branch}') AND`
    } else {
      branch_condition = ``
    }

    if (cnpj_client != null) {
      cnpj_client_condition = `SA1.A1_CGC IN ('${cnpj_client}') AND`
    } else {
      cnpj_client_condition = ``
    }

    const client_data = await request.query(
      `
            SELECT
                    RTRIM(SA1.A1_COD) AS client_code

            FROM    SA1010 AS SA1 WITH (NOLOCK)

            WHERE
                    ${branch_condition}
                    ${cnpj_client_condition}
                    SA1.A1_MSBLQL <> 1 AND
                    SA1.D_E_L_E_T_ = ''

            `
    )

    const client_code = client_data.recordsets[0][0].client_code
    console.log(client_code)

    // const api = axios.create({
    //   baseURL: process.env.PROTHEUS_API
    // })

    // const {
    //   data: { access_token }
    // } = await api
    //   .post('/restapi/api/oauth2/v1/token', null, {
    //     params: {
    //       grant_type: 'password',
    //       username: process.env.PROTHEUS_USERNAME,
    //       password: process.env.PROTHEUS_PASSWORD
    //     }
    //   })
    //   .catch((err) => console.log('auth', err))

    // console.log(access_token)

    // if (access_token) {
    //   api.defaults.headers.authorization = `Bearer ${access_token}`
    // }

    console.log(message)

    const messageItems = message.split('\n').map((item) => item.split(';'))
    const budgetCodes = messageItems.map((item) => ({ id: item[0] }))

    console.log(budgetCodes)

    // const { data: partNumbersData } = await api
    //   .get('/restapi/partnumber', {
    //     params: {
    //       userlog: '000001',
    //       company: '01',
    //       branch: '0201'
    //     },
    //     data: {
    //       part_number: budgetCodes
    //     }
    //   })
    //   .catch((err) => console.log('partNumber', err))
    // const partNumbers = partNumbersData.data.produto

    // const budgetItems = partNumbers.map((partNumber) => {
    //   const item = messageItems.find(
    //     (item) => item[0] === partNumber.part_number
    //   )

    //   return {
    //     produto: partNumber.codigo,
    //     quantidade: Number(item[1]),
    //     tipo_operacao: '01',
    //     part_number: partNumber.part_number
    //   }
    // })

    // const { data: budget } = await api
    //   .post(
    //     '/restapi/orcamentovenda',
    //     {
    //       orcamento: [
    //         {
    //           codigo_cliente: client_code,
    //           loja_cliente: '01',
    //           condicao_pagamento: '005',
    //           natureza_financeira: '10102',
    //           vendedor1: '000011',
    //           supervisor: '000001',
    //           tabela: '017',
    //           itens: budgetItems
    //         }
    //       ]
    //     },
    //     {
    //       params: {
    //         company: '01',
    //         branch: '0201'
    //       }
    //     }
    //   )
    //   .catch((err) => console.log('budget', err))

    // Initialize S3 Client
    const s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    })

    const pdfBase64 = test.data.orcamentovenda[1].fileContent
    // const pdfBase64 = budget.data.orcamentovenda[1].fileContent

    const pdf = Buffer.from(pdfBase64, 'base64')
    const filename = `budgets/orcamento-${crypto.randomUUID()}`
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${filename}.pdf`,
      Body: pdf
    }

    const updatePdfToS3 = async () => {
      // Create an object and upload it to the Amazon S3 bucket.
      try {
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
      } catch (err) {
        console.log('Error', err)
      }
    }

    await updatePdfToS3()
    console.log(
      `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
    )

    // This callback is what is returned in response to this function being invoked.
    // It's really important! E.g. you might respond with TWiML here for a voice or SMS response.
    // Or you might return JSON data to a studio flow. Don't forget it!
    return res.json({
      mediaUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}.pdf`
    })
  }
}
