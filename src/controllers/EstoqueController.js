const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    //querry request need to declare all the variables!
    const { filial, produto, grupo, armazem } = req.headers;

    if(filial!=null) {
      filial_condition = `FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(produto!=null) {
      produto_condition = `PRODUTO IN ('${produto}') AND`;
    } else {produto_condition = ``;};

    if(grupo!=null) {
      grupo_condition = `GRUPO IN (${grupo}) AND`;
    } else {grupo_condition = ``;};

    if(armazem!=null) {
      armazem_condition = `ARMAZEM IN (${armazem}) AND`;
    } else {armazem_condition = ``;};
    
           
        // query to the database and get the records
        await request.query(
            `
            SELECT FILIAL,PRODUTO,SALDO,ARMAZEM
            FROM SALDO_ESTOQUE 
            WHERE
            ${produto_condition}
            ${grupo_condition}
            ${filial_condition}
            ${armazem_condition}
            SALDO>0
            ORDER BY 'PRODUTO'
            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};