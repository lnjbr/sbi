import express from "express"
import complicitCorps from "./app.js"


const app = express()
const port = 3000

app.get('/', async (req, res) => {
const include = req.query.include ? req.query.include.split(',') : []
const exclude = req.query.exclude ? req.query.exclude.split(',') : []
if (include || exclude) {
  const match = []
  const totals = {"USD": 0, "sharesUSD": 0, "sharesCount": 0, "securitiesUSD": 0}
  for (const [key, value] of Object.entries(complicitCorps)) {
    if (include.every(category => value.categories.includes(category)) &&
        exclude.every(category => !value.categories.includes(category)) &&
        !match.includes(value)) {
      match.push({[key]: value})
      Object.keys(totals).forEach((total) =>
        totals[total] += value.total[total]
      )
    }
  }
  for (const [key, value] of Object.entries(totals)) {
    totals[key] = value.toLocaleString()
  }
  res.status(200).send([{totals}, match])
} else {
  const totals = {"USD": 0, "sharesUSD": 0, "sharesCount": 0, "securitiesUSD": 0}
    for (const [key, value] of Object.entries(complicitCorps)) {
      Object.keys(totals).forEach((total) =>
        totals[total] += value.total[total]
      )
    }
    for (const [key, value] of Object.entries(totals)) {
      totals[key] = value.toLocaleString()
    }
    
    res.send([{totals}, complicitCorps])
  }})

app.get('/corps/:corp?', async (req, res) => {
  if (req.params.corp) {
    const corp = (req.params.corp.split('_' || '-' || '%20').join(' ')).toUpperCase()
    Object.keys(complicitCorps).includes(corp) ?
      res.status(200).send({[corp]: complicitCorps[corp]}) :
      res.status(400).send("Could not find specific corporation.")
  } else {
    res.send(Object.keys(complicitCorps))
  }
})

app.get('/investments/:corp?', async (req, res) => {
  if (req.params.corp) {
    const corp = req.params.corp.split('_' || '-' || '%20').join(' ')
    res.send({ "shares": complicitCorps[corp].shares, "securities": complicitCorps[corp].securities})
  } else {
    const investments = {}
    for (const [key, value] of Object.entries(complicitCorps)) {
      investments[key] = {"shares": value.shares, "securities": value.securities, "total": value.total}
    }
    res.send(investments)
  }
  })

app.get('/totals/:corp?', async (req, res) => {
  if (req.params.corp) {
    const corp = req.params.corp.split('_' || '%20').join(' ')
    Object.keys(complicitCorps).includes(corp) ?
      res.status(200).send({[corp]: complicitCorps[corp].total}) :
      res.status(400).send("Could not find specified corporation.")
  } else {
    const totals = {"USD": 0, "sharesUSD": 0, "sharesCount": 0, "securitiesUSD": 0}
    for (const [key, value] of Object.entries(complicitCorps)) {
      Object.keys(totals).forEach((total) =>
        totals[total] += value.total[total]
      )
    }
    for (const [key, value] of Object.entries(totals)) {
      totals[key] = value.toLocaleString()
    }
    res.status(200).send(totals)
  }
})

app.listen(port, () => {
  console.log(`Listening`)
})
