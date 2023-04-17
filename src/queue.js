const Queue = require('./lib/Queue')

require('dotenv').config()
require('./database')

Queue.add('UpdateMargin', {
  filial_condition: 'F2_FILIAL IN (0101,0102) AND',
  produto_condition: '',
  grupo_condition: '',
  ano_condition: 'ANO IN (2021,2022,2023) AND',
  mes_condition: '',
  devolution_condition: 'VALOR_LIQUIDO_NF > 0 AND'
})
Queue.process()
