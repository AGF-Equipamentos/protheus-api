const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { branch } = req.query

    let branch_condition

    if (branch != null) {
      branch_condition = `WHERE vw_purchase_orders_grouped.branch IN (${branch})`
    } else {
      branch_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT  *

            FROM	  vw_purchase_orders_grouped

            ${branch_condition}

            ORDER BY vw_purchase_orders_grouped.number
            `,
      function (err, recordset) {
        if (err) console.log(err)

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
