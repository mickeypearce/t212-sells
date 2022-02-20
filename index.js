const csvToJson = require('convert-csv-to-json');
const _ = require('lodash');
const jsonToCsv = require('json-csv')
const fs = require('fs');
const firstline = require('firstline');

const fileInputName = process.argv[2] || 'input\\myInputFile.csv';
const fileOutputName = process.argv[3] || 'output\\myOutputFile.csv';

// Remove (, ), /, . and empty char
const sanitize = (str) => str.replace(/[\(\)\/. ]/g, '')

async function extract() {

    const json = csvToJson.fieldDelimiter(',').formatValueByType().getJsonFromCsv(fileInputName);
    console.log(`Reading from file ${fileInputName}.`)

// Clean property names as they cannot contain strange chars
    const jsonSane = json.map(o => {
        let newo = {}
        _.forEach(o, (value, key) =>
            newo[sanitize(key)] = value
        )
        return newo
    })
    //  console.log(jsonSane)

// Extract different shares tickers that were sold
    const tickerArray = _.uniq(
        _.filter(jsonSane, { Action: 'Market sell' }).map(o => o.Ticker)
    )
    // console.log(tickerArray)

// Get only trades by tickers in tickerArray
    const filteredJson = jsonSane.filter(o => tickerArray.includes(o.Ticker))
    // console.log(filteredJson)

// Create a map of tickers with arrays of open transaction IDs (buys that don't have sell afterwards)
    let openTxsMap = {}
    for (const tx of filteredJson) {
        if (!openTxsMap[tx.Ticker]) openTxsMap[tx.Ticker] = []
        if(tx.Action == 'Market buy') openTxsMap[tx.Ticker].push(tx.ID)
        if(tx.Action == 'Market sell') openTxsMap[tx.Ticker] = []
    }
    // console.log(openTxsMap)

    // const openTxs = _.flatten(Object.values(openTxsMap))
    const openTxs = Object.values(openTxsMap).flat()
    // console.log(openTxs)

// Filter out open transaction
    const finalJson = filteredJson.filter(o => !openTxs.includes(o.ID))

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
