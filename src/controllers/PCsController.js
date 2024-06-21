const sql = require('mssql')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const {
      filial,
      pc,
      produto,
      grupo,
      top,
      entregue,
      desc,
      cnpj,
      legenda,
      fornecedor
    } = req.query

    let filial_condition
    let pc_condition
    let produto_condition
    let grupo_condition
    let top_condition
    let entregue_condition
    let desc_condition
    let cnpj_condition
    let legenda_condition
    let fornecedor_condition

    if (filial != null) {
      filial_condition = `SC7.C7_FILIAL IN (${filial}) AND`
    } else {
      filial_condition = ``
    }

    if (pc != null) {
      pc_condition = `SC7.C7_NUM = ('${pc}') AND`
    } else {
      pc_condition = ``
    }

    if (grupo != null) {
      grupo_condition = `SB1.B1_GRUPO = ('${grupo}') AND`
    } else {
      grupo_condition = ``
    }

    if (cnpj != null) {
      cnpj_condition = `SA2.A2_CGC = ('${cnpj}') AND`
    } else {
      cnpj_condition = ``
    }

    if (top != null) {
      top_condition = `TOP ${top}`
    } else {
      top_condition = ``
    }

    if (desc != null && desc === 'true') {
      desc_condition = `SC7.C7_DATPRF DESC, SC7.C7_NUM DESC, SC7.C7_ITEM DESC`
    } else {
      desc_condition = `SC7.C7_DATPRF, SC7.C7_NUM, SC7.C7_ITEM`
    }

    if (produto != null) {
      if (typeof produto === 'object') {
        produto_condition = `SC7.C7_PRODUTO IN ('${produto.join(`','`)}') AND`
      } else {
        produto_condition = `SC7.C7_PRODUTO IN ('${produto}') AND`
      }
    } else {
      produto_condition = ``
    }

    if (entregue != null && entregue === 'true') {
      entregue_condition = `(C7_QUJE > 0) AND`
    } else {
      entregue_condition = ``
    }

    if (legenda != null && legenda) {
      if (typeof legenda === 'object') {
        legenda_condition = `CASE WHEN C7_RESIDUO <> '' THEN 'RESÍDUO ELIMINADO' WHEN C7_QTDACLA > 0 AND C7_RESIDUO = '' THEN 'PEDIDO USADO EM PRÉ-NOTA' WHEN C7_QUJE = 0 AND C7_QTDACLA = 0 AND
        C7_RESIDUO = '' THEN 'PENDENTE' WHEN C7_QUJE <> 0 AND C7_QUJE < C7_QUANT AND C7_RESIDUO = '' THEN 'ATENDIDO PARCIALMENTE' WHEN C7_QUJE >= C7_QUANT AND
        C7_RESIDUO = '' THEN 'PEDIDO ATENDIDO' ELSE '' END IN ('${legenda.join(
          `','`
        )}') AND`
      } else {
        legenda_condition = `CASE WHEN C7_RESIDUO <> '' THEN 'RESÍDUO ELIMINADO' WHEN C7_QTDACLA > 0 AND C7_RESIDUO = '' THEN 'PEDIDO USADO EM PRÉ-NOTA' WHEN C7_QUJE = 0 AND C7_QTDACLA = 0 AND
        C7_RESIDUO = '' THEN 'PENDENTE' WHEN C7_QUJE <> 0 AND C7_QUJE < C7_QUANT AND C7_RESIDUO = '' THEN 'ATENDIDO PARCIALMENTE' WHEN C7_QUJE >= C7_QUANT AND
        C7_RESIDUO = '' THEN 'PEDIDO ATENDIDO' ELSE '' END IN ('${legenda}') AND`
      }
    } else {
      legenda_condition = ``
    }

    if (fornecedor != null) {
      if (typeof fornecedor === 'object') {
        fornecedor_condition = `SC7.C7_FORNECE NOT IN ('${fornecedor.join(
          `','`
        )}') AND`
      } else {
        fornecedor_condition = `SC7.C7_FORNECE NOT IN ('${fornecedor}') AND`
      }
    } else {
      fornecedor_condition = ``
    }

    // query to the database and get the records
    await request.query(
      `
            SELECT  ${top_condition}
                    SC7.C7_NUM AS PEDIDO,
                    SC7.C7_ITEM AS ITEM,
                    SC7.C7_CONAPRO AS APROVADO,
                    CONCAT(SUBSTRING(SC7.C7_EMISSAO,7,2),'/',SUBSTRING(SC7.C7_EMISSAO,5,2),'/',SUBSTRING(SC7.C7_EMISSAO,1,4)) AS EMISSAO,
                    RTRIM(SC7.C7_PRODUTO) AS PRODUTO,
                    RTRIM(SC7.C7_DESCRI) AS DESCRICAO,
                    SC7.C7_UM AS UM,
                    SC7.C7_CC AS CENTRO_CUSTO,
                    CTT.CTT_DESC01 AS DESC_CENTRO_CUSTO,
                    SC7.C7_QUANT AS QTD,
                    SC7.C7_QUJE AS QTD_ENT,
                    SC7.C7_QUANT - SC7.C7_QUJE AS SALDO,
                    SC7.C7_PRECO AS PRECO,
                    SC7.C7_VALFRE AS FRETE,
                    SC7.C7_MOEDA AS MOEDA,
                    CTO.CTO_DESC AS DESC_MOEDA,
                    SC7.C7_COND AS COND_PAGTO,
                    SE4.E4_DESCRI AS DESC_PAGTO,
                    SC7.C7_VLDESC AS DESCONTO,
                    SC7.C7_NUMSC AS NUMSC,
                    RTRIM(SC7.C7_OBS) AS OBS,
                    SC7.C7_FORNECE AS FORN,
                    CASE WHEN C7_RESIDUO <> '' THEN 'RESÍDUO ELIMINADO' WHEN C7_QTDACLA > 0 AND C7_RESIDUO = '' THEN 'PEDIDO USADO EM PRÉ-NOTA' WHEN C7_QUJE = 0 AND C7_QTDACLA = 0 AND
                    C7_RESIDUO = '' THEN 'PENDENTE' WHEN C7_QUJE <> 0 AND C7_QUJE < C7_QUANT AND C7_RESIDUO = '' THEN 'ATENDIDO PARCIALMENTE' WHEN C7_QUJE >= C7_QUANT AND
                    C7_RESIDUO = '' THEN 'PEDIDO ATENDIDO' ELSE '' END AS LEGENDA,
                    CONCAT(SUBSTRING(SC7.C7_DATPRF,7,2),'/',SUBSTRING(SC7.C7_DATPRF,5,2),'/',SUBSTRING(SC7.C7_DATPRF,1,4)) AS ENTREGA,
                    RTRIM(SA2.A2_NREDUZ) AS DESC_FORN,
                    RTRIM(SA2.A2_CGC) AS CNPJ,
                    RTRIM(SC7.C7_OP) AS OP

            FROM	  SC7010 AS SC7 WITH (NOLOCK) INNER JOIN
                    SB1010 AS SB1 WITH (NOLOCK) ON SB1.D_E_L_E_T_ = '' AND SB1.B1_FILIAL = LEFT('${filial}', 2) AND SB1.B1_COD = SC7.C7_PRODUTO LEFT OUTER JOIN
                    CTT010 AS CTT WITH (NOLOCK) ON LEFT(SC7.C7_FILIAL, 2) = LEFT(CTT.CTT_FILIAL, 2) AND SC7.C7_CC = CTT.CTT_CUSTO LEFT OUTER JOIN
                    CTO010 AS CTO WITH (NOLOCK) ON LEFT(SC7.C7_FILIAL, 2) = LEFT(CTO.CTO_FILIAL, 2) AND SC7.C7_MOEDA = CTO.CTO_MOEDA LEFT OUTER JOIN
                    SE4010 AS SE4 WITH (NOLOCK) ON LEFT(SC7.C7_FILIAL, 2) = LEFT(SE4.E4_FILIAL, 2) AND SC7.C7_COND = SE4.E4_CODIGO LEFT OUTER JOIN
                    SA2010 AS SA2 WITH (NOLOCK) ON SA2.D_E_L_E_T_ = '' AND SA2.A2_FILIAL = LEFT('${filial}', 2) AND SA2.A2_COD = SC7.C7_FORNECE  AND SC7.C7_LOJA = SA2.A2_LOJA

            WHERE	  ${pc_condition}
                    ${filial_condition}
                    ${produto_condition}
                    ${grupo_condition}
                    ${entregue_condition}
                    ${cnpj_condition}
                    ${legenda_condition}
                    ${fornecedor_condition}
                    SC7.C7_RESIDUO = '' AND
                    SC7.D_E_L_E_T_ = ''

            ORDER BY ${desc_condition}
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

        return res.json(recordset.recordsets[0])
        // send records as a response
      }
    )
  }
}
