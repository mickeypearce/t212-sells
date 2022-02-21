# t212-sells

> Extract closed transactions (trxns that ended with a market sell in a date range) from exported csv file by Trading212

```bash
## install dependencies and extract with default input-output
> npm run extract

## or set different input, output and date range
> npm run extract -- --input yourInputFile.csv --output yourOutputFile.csv --from 2021-01-01 --to 2021-12-31
```
