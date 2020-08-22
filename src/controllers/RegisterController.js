const sql = require("mssql");

module.exports = {
  async index(req, res) {
    const request = new sql.Request();

    const { filial, op, produto } = req.headers;

    if(filial!=null) {
      filial_condition = `SD4.D4_FILIAL IN (${filial}) AND`;
    } else {filial_condition = ``;};

    if(op!=null) {
      op_condition = `SD4.D4_OP = ('${op}') AND`;
    } else {op_condition = ``;};

    if(produto!=null) {
      produto_condition = `SB1.B1_COD IN ('${produto}') AND`;
    } else {produto_condition = ``;};
           
    //CONCAT(SUBSTRING(SC2.C2_DATPRI,7,2),'/',SUBSTRING(SC2.C2_DATPRI,5,2),'/',SUBSTRING(SC2.C2_DATPRI,1,4)) AS ENTREGA

        // query to the database and get the records
        await request.query(
            `
            SELECT
                    RTRIM(SB1.B1_DESC) AS DESCRICAO,
                    SB1.B1_EMIN AS PP,
                    SB1.B1_LE AS LE,
                    SB1.B1_UM AS UM,
                    SB1.B1_ESTSEG AS ESTSEG

            FROM	  SB1010 AS SB1 

            WHERE	  ${produto_condition}
                    SB1.D_E_L_E_T_ = ''

            `, function (err, recordset) {
            
            if (err) console.log(err)

            return res.json(recordset.recordsets[0]);
            // send records as a response
            }
        )
  }
};