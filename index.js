const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const csvToJson = require('convert-csv-to-json');
const fp = require('lodash/fp');
const jsonToCsv = require('json-csv')
const fs = require('fs');
const firstline = require('firstline');

const fileInputName = argv.input || 'input\\myInputFile.csv';
const fileOutputName = argv.output || 'output\\myOutputFile.csv';
const dateFrom = Date.parse(argv.from) || Date.parse('1980-01-01 00:00:00')
const dateTo = Date.parse(argv.to) || Date.parse('2050-01-01 00:00:00')

// Remove (, ), /, . and empty char
const sanitize = (str) => str.replace(/[\(\)\/. ]/g, '')

const isDateInRange = (date) => ((Date.parse(date) >= dateFrom) && (Date.parse(date) <= dateTo))

async function extract() {

    const json = csvToJson.fieldDelimiter(',').formatValueByType().getJsonFromCsv(fileInputName);
    console.log(`Reading from file ${fileInputName}.`)

    // Clean property names as they cannot contain strange chars
    const jsonSane = json.map(o => {
        let newo = {}
        for (const [key, value] of Object.entries(o)) {
            newo[sanitize(key)] = value
        }
        return newo
    })
    //  console.log(jsonSane)

    // Extract all different shares tickers that were sold in date range
    const tickerArray = fp.pipe(
        fp.filter(tx => tx.Action == 'Market sell' && isDateInRange(tx.Time)),
        fp.map(tx => tx.Ticker),
        fp.uniq
    )(jsonSane)
    // console.log(tickerArray)

    // Get all transactions by Tickers in tickerArray and sort by Time
    const filteredJson = fp.pipe(
        fp.filter(tx => tickerArray.includes(tx.Ticker)),
        fp.sortBy(tx => Date.parse(tx.Time))
    )(jsonSane)
    // console.log(filteredJson)

    // Create a map of tickers with arrays of trx IDs to be removed:
    // - open transactions (buys that don't have sell afterwards)
    // - closed transactions not in range
    let toRemoveTxsMap = {}
    for (const tx of filteredJson) {
        if (!toRemoveTxsMap[tx.Ticker]) {
            toRemoveTxsMap[tx.Ticker] = []
        }
        if (tx.Action == 'Market buy') {
            toRemoveTxsMap[tx.Ticker].push(tx.ID)
        }
        // Clear array if sell and in range
        if (tx.Action == 'Market sell') {
            if (isDateInRange(tx.Time)) {
                toRemoveTxsMap[tx.Ticker] = []
            } else {
                toRemoveTxsMap[tx.Ticker].push(tx.ID)
            }
        }
    }
    // console.log(toRemoveTxsMap)

    const toRemoveTxs = Object.values(toRemoveTxsMap).flat()
    // console.log(openTxs)

    // Filter out transaction to be removed
    const finalJson = filteredJson.filter(o => !toRemoveTxs.includes(o.ID))

    // Write json to csv file
    const originalHeader = await firstline(fileInputName)
    // console.log(originalHeader)
    const headerMap = originalHeader
        .replace('\r', '')
        .split(',')
        .map(o => ({ name: sanitize(o), label: o }))
    // console.log(headerMap)

    const result = await jsonToCsv.buffered(finalJson, { fields: headerMap })
    fs.writeFileSync(fileOutputName, result)
    // console.log(result)
    console.log(`Created file ${fileOutputName}.`)

}

extract()
