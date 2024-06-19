const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { filial, vendedor, page, pageSize } = req.query
    console.log('Tete req', req.query)

    let pagination = {
      page: 1,
      pageSize: 10
    }

    if (typeof req.query.pagination === 'string') {
      try {
        const parsedPagination = JSON.parse(req.query.pagination)
        pagination.page = parseInt(parsedPagination.page, 10) || 1
        pagination.pageSize = parseInt(parsedPagination.pageSize, 10) || 10
      } catch (error) {
        console.error('Falha ao analisar o parâmetro de paginação:', error)
      }
    } else {
      pagination.page = parseInt(page, 10) || 1
      pagination.pageSize = parseInt(pageSize, 10) || 10
    }

    if (
      !Number.isInteger(pagination.page) ||
      !Number.isInteger(pagination.pageSize) ||
      pagination.pageSize <= 0
    ) {
      pagination = { page: 1, pageSize: 10 }
    }

    let filial_condition = filial ? `SA1.A1_FILIAL IN ('${filial}') AND` : ``
    let vendedor_condition = vendedor ? `SA1.A1_VEND = '${vendedor}' AND` : ``

    try {
      //query to the database and get the records
      const clients = await request.query(
        `
        SELECT
                RTRIM(SA1.A1_FILIAL) AS Filial,
                RTRIM(SA1.A1_COD) AS Cod_Cliente,
                RTRIM(SA1.A1_LOJA) AS Loja,
                RTRIM(SA1.A1_TIPO) AS Tipo,
                RTRIM(SA1.A1_NOME) AS Razao_Social,
                RTRIM(SA1.A1_NREDUZ) AS Nome_Reduz,
                RTRIM(SA1.A1_CGC) AS CNPJ,
                RTRIM(SA1.A1_END) AS Endereco,
                RTRIM(SA1.A1_BAIRRO) AS Bairro,
                RTRIM(SA1.A1_MUN) AS Municipio,
                RTRIM(SA1.A1_EST) AS UF,
                RTRIM(SA1.A1_CEP) AS CEP,
                RTRIM(SA1.A1_CONTATO) AS Contato,
                RTRIM(SA1.A1_EMAIL) AS Email,
                RTRIM(SA1.A1_TEL) AS Telefone,
                RTRIM(SA1.A1_VEND) AS Cod_Vendedor,
                RTRIM(SA3.A3_NOME) AS Nome_Vendedor,
                RTRIM(SA1.A1_ZZVEND2) AS Cod_Vendedor2,
                RTRIM(SA3_1.A3_NOME) AS Nome_Vendedor2,
                CASE 
                WHEN SA1.A1_ULTCOM IS NULL OR SA1.A1_ULTCOM = '' 
                THEN '' 
                ELSE RIGHT('0' + CAST(DATEPART(DAY, SA1.A1_ULTCOM) AS VARCHAR(2)), 2) + '/' +
                    RIGHT('0' + CAST(DATEPART(MONTH, SA1.A1_ULTCOM) AS VARCHAR(2)), 2) + '/' +
                    CAST(DATEPART(YEAR, SA1.A1_ULTCOM) AS VARCHAR(4))
                END AS Últ_Compra
    
        FROM  dbo.SA1010 AS SA1 WITH (NOLOCK) LEFT OUTER JOIN
                dbo.SA3010 AS SA3_1 ON LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3_1.A3_FILIAL, 2) AND SA1.A1_ZZVEND2 = SA3_1.A3_COD LEFT OUTER JOIN
                dbo.SA3010 AS SA3 ON SA1.A1_VEND = SA3.A3_COD AND LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3.A3_FILIAL, 2)
          
          WHERE  
                ${filial_condition}
                ${vendedor_condition}
                (SA1.A1_MSBLQL <> 1)
                AND (SA1.D_E_L_E_T_ = '')

          ORDER BY SA1.A1_NOME
          OFFSET ${(pagination.page - 1) * pagination.pageSize} ROWS
          FETCH NEXT ${pagination.pageSize} ROWS ONLY
          `
      )

      const total = await request.query(`
        SELECT COUNT(*) AS total FROM SA1010 AS SA1
        WHERE
                ${filial_condition}
                ${vendedor_condition}
                (SA1.A1_MSBLQL <> 1)
                AND (SA1.D_E_L_E_T_ = '')
      `)

      return res.json({
        data: clients.recordsets[0],
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: Math.ceil(
              total.recordset[0].total / pagination.pageSize
            ),
            total: total.recordset[0].total
          }
        }
      })
    } catch (error) {
      console.error('Database query failed', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
