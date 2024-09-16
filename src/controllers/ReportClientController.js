const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const {
      filial,
      pagination: paginationRaw = {
        page: 1,
        pageSize: 10
      },
      filters: filtersRaw,
      usePagination = 'true'
    } = req.query

    const pagination = JSON.parse(paginationRaw)
    const filters = filtersRaw ? JSON.parse(filtersRaw) : {}
    const { cod_seller } = filters

    const columnsKeys = {
      Filial: 'SA1.A1_FILIAL',
      Cod_Cliente: 'SA1.A1_COD',
      Loja: 'SA1.A1_LOJA',
      Tipo: 'SA1.A1_TIPO',
      Razao_Social: 'SA1.A1_NOME',
      Nome_Reduz: 'SA1.A1_NREDUZ',
      CNPJ: 'SA1.A1_CGC',
      Endereco: 'SA1.A1_END',
      Bairro: 'SA1.A1_BAIRRO',
      Municipio: 'SA1.A1_MUN',
      UF: 'SA1.A1_EST',
      CEP: 'SA1.A1_CEP',
      Contato: 'SA1.A1_CONTATO',
      Email: 'SA1.A1_EMAIL',
      Telefone: 'SA1.A1_TEL',
      Cod_Vendedor: 'SA1.A1_VEND',
      Nome_Vendedor: 'SA3.A3_NOME',
      Cod_Vendedor2: 'SA1.A1_ZZVEND2',
      Nome_Vendedor2: 'SA3_1.A3_NOME',
      Últ_Compra: 'SA1.A1_ULTCOM'
    }

    let filial_condition
    let generic_condition
    let cod_seller_condition

    if (filial != null) {
      filial_condition = `SA1.A1_FILIAL IN (${filial}) AND`
    }

    if (filters.column && filters.value) {
      generic_condition = `${columnsKeys[filters.column]} = '${
        filters.value
      }' AND`
    } else {
      generic_condition = ``
    }

    if (cod_seller) {
      const divideSellerCode = cod_seller.split(';')
      cod_seller_condition = `SA1.A1_VEND IN (${divideSellerCode}) AND`
    } else {
      cod_seller_condition = ``
    }

    try {
      let query
      if (usePagination == 'true') {
        // Use pagination
        query = `
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
          FROM dbo.SA1010 AS SA1 WITH (NOLOCK)
          LEFT OUTER JOIN dbo.SA3010 AS SA3_1 ON LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3_1.A3_FILIAL, 2) AND SA1.A1_ZZVEND2 = SA3_1.A3_COD
          LEFT OUTER JOIN dbo.SA3010 AS SA3 ON SA1.A1_VEND = SA3.A3_COD AND LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3.A3_FILIAL, 2)
          WHERE 
            ${filial_condition}
            ${generic_condition}
            ${cod_seller_condition}
            SA1.D_E_L_E_T_ = ''
          ORDER BY SA1.A1_NOME
          OFFSET ${(pagination.page - 1) * pagination.pageSize} ROWS
          FETCH NEXT ${pagination.pageSize} ROWS ONLY
        `
      } else {
        // No pagination
        query = `
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
          FROM dbo.SA1010 AS SA1 WITH (NOLOCK)
          LEFT OUTER JOIN dbo.SA3010 AS SA3_1 ON LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3_1.A3_FILIAL, 2) AND SA1.A1_ZZVEND2 = SA3_1.A3_COD
          LEFT OUTER JOIN dbo.SA3010 AS SA3 ON SA1.A1_VEND = SA3.A3_COD AND LEFT(SA1.A1_FILIAL, 2) = LEFT(SA3.A3_FILIAL, 2)
          WHERE 
            ${filial_condition}
            ${generic_condition}
            ${cod_seller_condition}
            SA1.D_E_L_E_T_ = ''
          ORDER BY SA1.A1_NOME
        `
      }

      // Query to get the records
      const clients = await request.query(query)

      const total = await request.query(`
        SELECT COUNT(*) AS total 
        FROM SA1010 AS SA1
        WHERE 
            ${filial_condition}
            ${generic_condition}
            ${cod_seller_condition}
            SA1.D_E_L_E_T_ = ''
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
