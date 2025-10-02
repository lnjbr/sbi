// package.json scripts
// "md": "node md1.js",

// server.js
// import complicitCorpsOld from "./app.123124.js"
// const complicitCorps = complicitCorpsOld

// app,js
// const calculateTotal = () => {
//   const totalsArray = []
//   for (const [key, value] of Object.entries(complicitCorps)) {
//     complicitCorps[key]["total"] = {"USD": parseFloat((value.shares[1] + value.securities[1]).toFixed(0)),"sharesUSD": value.shares[1], "sharesCount": value.shares[0],"securitiesUSD": value.securities[1]}
//     totalsArray.push([complicitCorps[key]["commonName"], complicitCorps[key].total.USD])
//   }
// }

import complicitCorpsOld from "./complicitCorps.js"
import PDFParser from "pdf2json"

const pdfName = "sbi_123124.pdf"
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
        const textRow = Math.round((text.y)*65)/65
        const textString = decodeURIComponent(text.R[0].T)
        if (textString) {
          if (textRow in pages[pageNumber]) {
            pages[pageNumber][textRow].push(textString) 
            // if (pageNumber == "shares88") console.log(pages["shares88"])
          }
          else {
            pages[pageNumber][textRow] = [textString]
          }
        }
      })
    }
  })
  return pages
 }

const filterInvestments = (pages, complicitCorpsOld) => {
  const investments = {}
  const altNames = {}
  const complicitCorpsOldNames = Object.keys(complicitCorpsOld)
  // console.log(pages.shares22)

  complicitCorpsOldNames.forEach((complicitCorpName) => {
    investments[complicitCorpName] = {"shares":[0,0,0], "securities":[0,0,0]}
    if (complicitCorpsOld[complicitCorpName]["altNames"].length) {
      complicitCorpsOld[complicitCorpName]["altNames"].forEach((altName) => {
        altNames[altName] = complicitCorpName
      })
    } else {
      altNames[complicitCorpName] = complicitCorpName
    }
  })

  Object.keys(pages).forEach((page) => {
    Object.keys(pages[page]).forEach((row) => {
        let issuer = pages[page][row].shift()
        if (issuer && /^[a-zA-Z]/.test(pages[page][row][0])) issuer = issuer.concat(pages[page][row].shift())
        const complicitCorpName = Object.keys(altNames).find((altName) => issuer.includes(altName))
        const corp = issuer && complicitCorpsOldNames.includes(issuer.match(/^(\D*)/g)[0].trim()) ? issuer.match(/^(\D*)/g)[0].trim() : altNames[complicitCorpName] 
        if (complicitCorpsOldNames.includes(corp)){
          let type = page.match(/([a-z])+/g)
          let numbers = pages[page][row].join('').split(' ').filter(i => i)
          // console.log(corp, numbers, pages[page][row])
          investments[corp][type] = investments[corp][type].map((val, i) => Number(val) + Number(numbers.map((val) => val.split(',').join(''))[i]))
        }
    })
  })
  return investments
}

const calculateTotal = () => {
  const totalsArray = []

  for (const [key, value] of Object.entries(complicitCorpsOld)) {
    complicitCorpsOld[key]["total"] = {"USD": parseFloat((value.shares[1] + value.securities[1]).toFixed(0)),"sharesUSD": value.shares[1], "sharesCount": value.shares[0],"securitiesUSD": value.securities[1]}
    totalsArray.push([complicitCorpsOld[key]["commonName"], complicitCorpsOld[key].total.USD])
  }
  console.log(totalsArray)
}

const main = async () => {
  const res = await read()
  const pages = getPages(res)
  const investments = filterInvestments(pages, complicitCorpsOld)
    Object.keys(investments).forEach((corp) => {
      complicitCorpsOld[corp] = {...complicitCorpsOld[corp], ...investments[corp]}
    })
  calculateTotal()
}

export default complicitCorpsOld
await main()
