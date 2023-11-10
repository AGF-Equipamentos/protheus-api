const sql = require('mssql')
const { groupsByType } = require('../utils/others/groupsByType')

module.exports = {
  async index(req, res) {
    const request = new sql.Request()

    const { branch, year } = req.query

    let branch_condition
    let year_condition

    if (year != null) {
      if (typeof year === 'object') {
        year_condition = `ANO IN ('${year.join(`','`)}') AND`
      } else {
        year_condition = `ANO IN ('${year}') AND`
      }
    } else {
      year_condition = ``
    }

    if (branch != null) {
      if (typeof branch === 'object') {
        branch_condition = `F2_FILIAL IN ('${branch.join(`','`)}') AND`
      } else {
        branch_condition = `F2_FILIAL IN ('${branch}') AND`
      }
    } else {
      branch_condition = ``
    }

    const piecesGroups = groupsByType
      .filter((group) => group.TIPO === 'PEÇAS')
      .map((group) => group.CODIGO)

    // Verificar devoluções / faturamento negativo -> SELECT SUM(D2_TOTAL)...
    await request.query(
      `
      SELECT
        FAT,
        ANO,
        MES,
        GRUPO,
        RTRIM(A3_NOME) AS VENDEDOR
      FROM (

        SELECT SUM(D2_TOTAL) AS FAT, ANO, MES, 'PEÇAS' AS GRUPO, A3_NOME
        FROM (
          SELECT * FROM FATURAMENTO
          WHERE B1_GRUPO IN (${piecesGroups.join(',')})
        ) AS FATURAMENTO
        WHERE
          ${year_condition}
          ${branch_condition}
          F4_DUPLIC = 'S'
          AND D2_TOTAL > 0
          AND A3_NOME IS NOT NULL
        GROUP BY ANO, MES, A3_NOME

        UNION ALL

        SELECT
          SUM(D2_TOTAL) AS FAT,
          ANO,
          MES,
          RTRIM(BM_DESC) AS GRUPO,
          A3_NOME
        FROM (
          SELECT *
          FROM FATURAMENTO
          WHERE B1_GRUPO NOT IN (${piecesGroups.join(',')})
          ) AS FATURAMENTO
        WHERE
          ${year_condition}
          ${branch_condition}
          F4_DUPLIC = 'S'
          AND D2_TOTAL > 0
          AND A3_NOME IS NOT NULL
        GROUP BY ANO, MES, A3_NOME, BM_DESC

        UNION ALL

        SELECT SUM(D2_TOTAL) AS FAT, ANO, MES, 'PEÇAS' AS GRUPO, A3_NOME
        FROM (
          SELECT FAT.D2_TOTAL, ANO, MES, SA3.A3_NOME, NF_ORIG, FAT.F2_FILIAL, FAT.F4_DUPLIC
          FROM FATURAMENTO AS FAT WITH (NOLOCK)
          INNER JOIN SF2010 AS SF2 ON FAT.NF_ORIG = SF2.F2_DOC
          INNER JOIN SA3010 AS SA3 ON SF2.F2_VEND1 = SA3.A3_COD
          WHERE B1_GRUPO IN (${piecesGroups.join(',')})
        ) AS FATURAMENTO
        WHERE
          ${year_condition}
          ${branch_condition}
          F4_DUPLIC = 'S'
          AND D2_TOTAL < 0
          AND A3_NOME IS NOT NULL
        GROUP BY ANO, MES, A3_NOME

        UNION ALL

        SELECT
          SUM(D2_TOTAL) AS FAT,
          ANO,
          MES,
          RTRIM(BM_DESC) AS GRUPO,
          A3_NOME
        FROM (
          SELECT FAT.D2_TOTAL, ANO, MES, SA3.A3_NOME, FAT.F2_FILIAL, FAT.F4_DUPLIC, FAT.BM_DESC
          FROM FATURAMENTO AS FAT WITH (NOLOCK)
          INNER JOIN SF2010 AS SF2 ON FAT.NF_ORIG = SF2.F2_DOC
          INNER JOIN SA3010 AS SA3 ON SF2.F2_VEND1 = SA3.A3_COD
          WHERE B1_GRUPO NOT IN (${piecesGroups.join(',')})
          ) AS FATURAMENTO
        WHERE
          ${year_condition}
          ${branch_condition}
          F4_DUPLIC = 'S'
          AND D2_TOTAL > 0
          AND A3_NOME IS NOT NULL
        GROUP BY ANO, MES, A3_NOME, BM_DESC

      ) FATURAMENTO
      ORDER BY
        A3_NOME,
        GRUPO,
        ANO,
        MES
            `,
      async function (err, recordset) {
        if (err) {
          console.log(err)
          return res.json({
            error: {
              message: err
            }
          })
        }

        function findLatestYearMonth(data) {
          let latestYear = 0
          let latestMonth = 0

          for (const obj of data) {
            const { ANO, MES } = obj
            const year = parseInt(ANO)
            const month = parseInt(MES)

            if (
              year > latestYear ||
              (year === latestYear && month > latestMonth)
            ) {
              latestYear = year
              latestMonth = month
            }
          }

          return {
            ANO: String(latestYear),
            MES: String(latestMonth).padStart(2, '0')
          }
        }

        function preprocessData(data) {
          const processedData = []
          const latestYearMonth = findLatestYearMonth(data)

          for (let i = 0; i < data.length; i++) {
            const currentObj = data[i]
            const { GRUPO, VENDEDOR, ANO, MES } = currentObj

            // Adicionar objeto atual ao array processado
            processedData.push(currentObj)

            if (i < data.length - 1) {
              const nextObj = data[i + 1]
              const nextGRUPO = nextObj.GRUPO
              const nextVENDEDOR = nextObj.VENDEDOR

              if (nextGRUPO === GRUPO && nextVENDEDOR === VENDEDOR) {
                const nextANO = nextObj.ANO
                const nextMES = nextObj.MES

                const diffYears = parseInt(nextANO) - parseInt(ANO)
                const diffMonths =
                  diffYears * 12 + (parseInt(nextMES) - parseInt(MES))

                if (diffMonths > 1) {
                  // Adicionar objetos dos meses faltantes
                  let currentYear = parseInt(ANO)
                  let currentMonth = parseInt(MES)

                  for (let j = 1; j < diffMonths; j++) {
                    currentMonth += 1

                    if (currentMonth > 12) {
                      currentMonth = 1
                      currentYear += 1
                    }

                    const missingMonth = String(currentMonth).padStart(2, '0')

                    processedData.push({
                      FAT: 0,
                      ANO: String(currentYear),
                      MES: missingMonth,
                      GRUPO,
                      VENDEDOR
                    })
                  }
                }
              } else {
                let currentYear = parseInt(ANO)
                let currentMonth = parseInt(MES)

                const latestYear = parseInt(latestYearMonth.ANO)
                const latestMonth = parseInt(latestYearMonth.MES)

                while (
                  currentYear < latestYear ||
                  (currentYear === latestYear && currentMonth < latestMonth)
                ) {
                  let nextMonth = currentMonth + 1
                  let nextYear = currentYear

                  if (nextMonth > 12) {
                    nextMonth = 1
                    nextYear += 1
                  }

                  const missingMonth = String(nextMonth).padStart(2, '0')

                  processedData.push({
                    FAT: 0,
                    ANO: String(nextYear),
                    MES: missingMonth,
                    GRUPO,
                    VENDEDOR
                  })

                  currentMonth = nextMonth
                  currentYear = nextYear
                }
              }
            }
          }

          return processedData
        }

        function calcularFAT_ACU(arr) {
          let menorAno = Infinity

          for (let i = 0; i < arr.length; i++) {
            const obj = arr[i]
            let fatAcumulado = obj.FAT

            // Verifica se é possível calcular o FAT_ACU
            if (
              i > 0 &&
              obj.GRUPO === arr[i - 1].GRUPO &&
              obj.VENDEDOR === arr[i - 1].VENDEDOR
            ) {
              const limite = Math.max(i - 12, 0)

              // Soma o valor do FAT dos registros anteriores do mesmo GRUPO e VENDEDOR
              for (let j = i - 1; j >= limite; j--) {
                if (
                  arr[j].GRUPO === obj.GRUPO &&
                  arr[j].VENDEDOR === obj.VENDEDOR
                ) {
                  fatAcumulado += arr[j].FAT
                } else {
                  break
                }
              }
            }
            obj.FAT_ACU = fatAcumulado

            // Atualiza o menor ano
            if (Number(obj.ANO) < menorAno) {
              menorAno = Number(obj.ANO)
            }
          }

          // Remove os objetos com o menor ano
          arr = arr.filter((obj) => Number(obj.ANO) !== menorAno)

          return arr
        }

        const arrayPreprocessado = preprocessData(recordset.recordsets[0])

        const novoArray = calcularFAT_ACU(arrayPreprocessado)

        return res.json(novoArray)
        // send records as a response
      }
    )
  }
}
