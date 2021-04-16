const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, produto, mes, ano, grupo } = req.query;

    if(produto!=null) {
      produto_condition = `PRODUTO IN ('${produto}') AND`;
    } else {produto_condition = ``;};

    if(filial!=null) {
      filial_condition = `FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(grupo!=null) {
      grupo_condition = `GRUPO IN (${grupo}) AND`;
    } else {grupo_condition = ``;};

    if(mes!=null) {
      mes_condition = `MES IN (${mes}) AND`;
    } else {mes_condition = ``;};

    if(ano!=null) {
      ano_condition = `ANO IN (${ano}) AND`;
    } else {ano_condition = ``;};
           
        // query to the database and get the records
        await request.query(
            `
            SELECT  OP,
                    FILIAL,
                    PRODUTO,
                    DESCRICAO,
                    GRUPO,
                    CUSTO,
                    (CUSTO / QTD_PROD) AS CUSTO_UN,
                    MES,
                    ANO

            FROM    OP

            WHERE   ${filial_condition}
                    ${grupo_condition}
                    ${produto_condition}
                    ${mes_condition}
                    ${ano_condition}
                    CUSTO > 0

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};