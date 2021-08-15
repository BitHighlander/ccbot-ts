const { GraphQLClient } = require('graphql-request');
const symbolIDMap = {
    btc: 'bitcoin',
    eth: 'ethereum',
    xrp: 'ripple',
    bch: 'bitcoin-cash',
    eos: 'eos',
    xlm: 'stellar',
    ltc: 'litecoin',
    usdt: 'tether',
    ada: 'cardano',
    xmr: 'monero',
    trx: 'tron',
    iota: 'iota',
    miota: 'iota',
    dash: 'dash',
    bnb: 'binance-coin',
    neo: 'neo',
    etc: 'ethereum-classic',
    xem: 'nem',
    nem: 'nem',
    xtz: 'tezos',
    vet: 'vechain',
    doge: 'dogecoin',
    zec: 'zcash',
    mkr: 'maker',
    omg: 'omisego',
    zrx: '0x',
    '0x': '0x',
    btg: 'bitcoin-gold',
    ont: 'ontology',
    dcr: 'decred',
    lsk: 'lisk',
    qtum: 'qtum',
    dgb: 'digibyte',
    sky: 'skycoin',
    rvn: 'ravencoin',
    fun: 'funfair',
    mana: 'decentraland',
    bat: 'basic-attention-token',
    tusd: 'trueusd',
    knc: 'kyber-network',
    sc: 'siacoin',
    dai: 'dai',
    pax: 'paxos-standard-token',
    swarm: 'swarm-fund',
    zp: 'zen-protocol'
}

const graphql = new GraphQLClient('https://graphql.coincap.io/');

const getMarketDataForIDs = async (ids: string | any[]) => {
    const query = /* GraphQL */ `
    {
      assets(first: ${ids.length}, where: {
        id_in: ${JSON.stringify(ids)}
      }) {
        edges {
          node {
            id,
            symbol,
            priceUsd,
            changePercent24Hr
          }
        }
      }
    }`;

    return await graphql.request(query);
}

const getIDForSymbol = async (symbol: any) => {
    try {
        const query = `{
      assets(
        first: 1, 
        where: {
          symbol_starts_with: "${symbol}"
        }, 
        sort: rank, 
        direction: ASC) 
      {
        edges {
          node {
            id,
          }
        }
      }
    }`;

        const ret = await graphql.request(query);
        const ID = ret.assets.edges[0].node.id;
        // Cache
        // @ts-ignore
        symbolIDMap[symbol] = ID;
        return ID;

    } catch (err) {
        return symbol;
    }
}

const getMarketDataForSymbols = async (symbols: (string | number)[]) => {
    let ids = symbols.map((symbol: any) => {
        // @ts-ignore
        return symbolIDMap[symbol] !== undefined ?
            // @ts-ignore
            symbolIDMap[symbol] :
            // @ts-ignore
            getIDForSymbol(symbol);
    });
    ids = await Promise.all(ids);
    const ret = await getMarketDataForIDs(ids);
    const marketDatas = ret.assets.edges.map((edge: { node: any; }) => edge.node);
    return marketDatas;
}

const getHistoryForSymbol = async (symbol:string) => {
    const id = await getIDForSymbol(symbol);

    const query = /* GraphQL */ `
  {
    assetHistories(assetId: "${id}" interval: h1, limit: 24)
    {
      priceUsd,
      date,
      timestamp
    }
  }`;

    const ret = await graphql.request(query);
    return ret.assetHistories;
}

module.exports = {
    getMarketDataForIDs,
    getIDForSymbol,
    getMarketDataForSymbols,
    getHistoryForSymbol
}
