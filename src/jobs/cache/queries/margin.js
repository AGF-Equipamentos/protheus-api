module.exports = {
  query: `
    SELECT
    RTRIM(D2_COD) AS PRODUTO,
    RTRIM(B1_DESC) AS DESCRICAO,
    D2_TOTAL AS VALOR,
    ANO,
    MES,
    MARGEM,
    D2_QUANT AS QTD

    FROM    FATURAMENTO WITH (NOLOCK)

    WHERE   F2_FILIAL IN (0101,0102) AND

    ANO IN (2022,2023,2024) AND

    VALOR_LIQUIDO_NF > 0 AND
    (F4_DUPLIC = 'S')

    ORDER BY D2_COD
  `,
  params: { filial: '0101,0102', ano: '2022,2023,2024', devolution: 'no' }
}
