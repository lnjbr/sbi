import complicitCorps from "./complicitCorps.js"
import PDFParser from "pdf2json"
import pdfName from './pdfName.js'

const read = async () => {
  const pdfParser = new PDFParser();
  pdfParser.loadPDF(pdfName)
  // open PDF
  const res = await new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", errData => reject(console.error("Could not access specified file.")))
    pdfParser.on("pdfParser_dataReady", res => resolve(res))
  })
  return res
}

const getPages = (res) => {
  const unparsedPages = res.Pages
  const pages = {}
  unparsedPages.forEach((page) => {
    const header = decodeURIComponent(page.Texts[0].R[0].T)
    let type = header.includes("Equity") ? "shares" : (header.includes("Securities") || header.includes("Stable Value Fund")) ? "securities" : ""
    if (type) {
      const pageNumber = type.concat(Object.keys(pages).length+1)
      pages[pageNumber] = {}
      const texts = page.Texts
      texts.forEach((text) => {
        const textRow = Math.round((text.y)*100)/100
        const textString = decodeURIComponent(text.R[0].T)
        if (textString) {
          textRow in pages[pageNumber] ?
          pages[pageNumber][textRow].push(textString) : pages[pageNumber][textRow] = [textString]
        }
      })
    }
  })
  return pages
 }

const filterInvestments = (pages, complicitCorps) => {
  const investments = {}
  const altNames = {}
  const complicitCorpsNames = Object.keys(complicitCorps)
  complicitCorpsNames.forEach((complicitCorpName) => {
    investments[complicitCorpName] = {"shares":[0,0,0], "securities":[0,0,0]}
    if (complicitCorps[complicitCorpName]["altNames"].length) {
      complicitCorps[complicitCorpName]["altNames"].forEach((altName) => {
        altNames[altName] = complicitCorpName
      })
    } else {
      altNames[complicitCorpName] = complicitCorpName
    }
  })

  Object.keys(pages).forEach((page) => {
    Object.keys(pages[page]).forEach((row) => {
        const issuer = pages[page][row].shift()
        const complicitCorpName = Object.keys(altNames).find((altName) => issuer.includes(altName))
        const corp = issuer && complicitCorpsNames.includes(issuer.match(/^(\D*)/g)[0].trim()) ? issuer.match(/^(\D*)/g)[0].trim() : altNames[complicitCorpName] 
        if (complicitCorpsNames.includes(corp)){
          let type = page.match(/([a-z])+/g)
          investments[corp][type] = investments[corp][type].map((val, i) => Number(val) + Number(pages[page][row].map((val) => val.split(',').join(''))[i]))
      }
    })
  })
  return investments
}

const calculateTotal = () => {
  for (const [key, value] of Object.entries(complicitCorps)) {
    complicitCorps[key]["total"] = {"USD": value.shares[1] + value.securities[1],"sharesUSD": value.shares[1], "sharesCount": value.shares[0],"securitiesUSD": value.securities[1]}
  }
}

const main = async () => {
  const res = await read()
  const pages = getPages(res)
  const investments = filterInvestments(pages, complicitCorps)
    Object.keys(investments).forEach((corp) => {
      complicitCorps[corp] = {...complicitCorps[corp], ...investments[corp]}
    })
  calculateTotal()
}

export default complicitCorps
await main()
