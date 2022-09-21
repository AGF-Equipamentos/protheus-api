const { format } = require('date-fns')
const sql = require('mssql')
const { balanceTotalkardex } = require('../utils/kardexBalance')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const {
      filial = '0101',
      produto = '',
      data_inicio = new Date(2000, 0, 1),
      data_fim = new Date(2099, 0, 1),
      armazem_inicio = '01',
      armazem_fim = '01'
    } = req.query

    await request.query(
      `
      SELECT * 
      FROM (
  
          SELECT * 
          FROM vw_stock_balance WITH (NOLOCK) 
          WHERE [Data Mov.] = ( 
                SELECT TOP 1 B9_DATA 
              FROM SB9010 SB9 WITH (NOLOCK)
              WHERE SB9.D_E_L_E_T_ = '' 
                    AND B9_FILIAL = '${filial}'
                    AND B9_DATA < '${format(new Date(data_inicio), 'yyyyMMdd')}'
              ORDER BY B9_DATA DESC
          ) 
              
          UNION ALL
          
          SELECT *
          FROM vw_stock_movements WITH (NOLOCK) 
          WHERE [Data Mov.] BETWEEN '${format(
            new Date(data_inicio),
            'yyyyMMdd'
          )}' AND '${format(new Date(data_fim), 'yyyyMMdd')}'
          
      ) AS TMP 
      
      WHERE [Filial] = '${filial}'
            AND [Produto] = '${produto}'
            AND [Armazem] BETWEEN '${armazem_inicio}' AND '${armazem_fim}'      
      ORDER BY [Data Mov.],
               [Sequencia],
               [CFOP] DESC
        `,

      function (err, recordset) {
        if (err) {
          console.log(err)
          return res.json({
            error: {
              message: err
            }
          })
        }
        const kardex = balanceTotalkardex(recordset.recordsets[0])
        return res.json(kardex)
      }
    )
  }
}
