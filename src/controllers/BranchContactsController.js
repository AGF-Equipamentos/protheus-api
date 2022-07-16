module.exports = {
  async index(_, res) {
    return res.json({
      refresh: 0,
      items: [
        {
          number: '200',
          name: 'Portaria',
          firstname: 'Bruno Sossai',
          lastname: '',
          phone: '',
          mobile: '',
          email: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          comment: '',
          presence: 0,
          starred: 0,
          info: ''
        }
      ]
    })
  }
}
