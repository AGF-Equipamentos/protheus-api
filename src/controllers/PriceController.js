const sql = require("mssql");
const { randomUUID } = require("crypto")

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { branch, part_number, table_pn } = req.query;

    if(branch!=null) {
      branch_condition = `DA1.DA1_FILIAL IN ('${filial.slice(0,2)}') AND`;
    } else {branch_condition = ``;};

    if(part_number!=null) {
      part_number_condition = `DA1.DA1_CODPRO IN ('${part_number.toUpperCase().trim()}') AND`;
    } else {part_number_condition = ``;};

    if(table_pn!=null) {
      table_pn_condition = `DA1.DA1_CODTAB IN ('${table_pn}') AND`;
    } else {table_pn_condition = ``;};
           
        await request.query(
            `
            SELECT
                    RTRIM(DA1.DA1_CODPRO) AS part_number,
                    DA1.DA1_PRCVEN AS price,
                    DA1.DA1_CODTAB AS table_pn

            FROM	  DA1010 AS DA1 WITH (NOLOCK) 

            WHERE	  ${part_number_condition}
                    ${table_pn_condition}  
                    ${branch_condition}
                    DA1.D_E_L_E_T_ = ''

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0].map(priceItem => ({
              ...priceItem,
              id: randomUUID(),
              formatted_price: 
                new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(priceItem.price)
            })));
            }
        )
  }
};