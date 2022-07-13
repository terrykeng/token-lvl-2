import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const shouldFail = async (fp) => {
  let worked = undefined;
  try {
    await fp();
    worked = true;
  } catch (e) {
    worked = false;
  }
  console.log(`\tshouldFail = ${worked}`);
  if (worked !== false) {
    throw Error(`shouldFail`);
  }
};

const commonFunctions = {
  seeNotification : (ready) => {
    if(ready)
      console.log('Bob accepted the whitelist');
    else
      console.log('Bob rejected the whitelist')
  },
  attacherMatched : (ready) => {
    if(ready)
      console.log(stdlib.formatAddress(accBob), ' Found in the whitelist');
    else
      console.log(stdlib.formatAddress(accBob), ' was not found in the whitelist')
  },
  
};

const startingBalance = stdlib.parseCurrency(100);
const time = stdlib.connector === 'CFX' ? 50 : 10;

const [ accAlice, accBob, accTee ] =
  await stdlib.newTestAccounts(3, startingBalance);
  const fmt = (x) => stdlib.formatCurrency(x, 4);
  



const IToken = await stdlib.launchToken(accAlice, "TEE COIN", "TC");
//const TToken = await stdlib.launchToken(accAlice,'tee', 'TEE');


if ( stdlib.connector === 'ETH' || stdlib.connector === 'CFX' ) {
  const gasLimit = 5000000;
  accAlice.setGasLimit(gasLimit);
  accBob.setGasLimit(gasLimit);
  accTee.setGasLimit(gasLimit);
} else if ( stdlib.connector == 'ALGO' ) {
  console.log(`Demonstrating need to opt-in on ALGO`);
  //await shouldFail(async () => await zorkmid.mint(accAlice, startingBalance));
  console.log(`Opt-ing in on ALGO`);
  await accAlice.tokenAccept(IToken.id);
  await accBob.tokenAccept(IToken.id);
  await accTee.tokenAccept(IToken.id);
}

await IToken.mint(accAlice, 100);

console.log('Launching...');
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());
const ctcTee = accTee.contract(backend, ctcAlice.getInfo());

console.log('Starting backends...');

await Promise.all([
  backend.Alice(ctcAlice, {
    ...commonFunctions,
    tokenDetails : () => {
        //console.log(IToken.name.toString())
        return [IToken.id, 100, time];
    },
    aliceAdd : () => {
      console.log('Providing Bob\'s Address which is', stdlib.formatAddress(accBob));
      return accBob.getAddress();
    },
    aliceAdd2 : () => {
      console.log('Providing Tee\'s Address which is', stdlib.formatAddress(accTee));
      return accTee.getAddress();
    },
    attacherMatched1 : (ready) => {
      if(ready)
        console.log(stdlib.formatAddress(accTee), ' Found in the whitelist');
      else
        console.log(stdlib.formatAddress(accTee), ' was not found in the whitelist')
    }
  }),
  backend.Bob(ctcBob, {
    ...commonFunctions,
    ready : (...v) => {
      console.log(`Bob optin Token `, IToken.name);
      return true;
    }
  }),
  backend.Tee(ctcTee, {
    ...commonFunctions,
    ready1 : (...v) => {
      console.log(`Tee optin Token `, IToken.name);
      return false;
    },
    attacherMatched1 : (ready1) => {
      if(ready1)
        console.log(stdlib.formatAddress(accTee), ' Found in the whitelist');
      else
        console.log(stdlib.formatAddress(accTee), ' was not found in the whitelist')
    }
  }),
]);

console.log('Distribution Completed!');
const aliceAfter = await accAlice.balancesOf([IToken.id]);
const bobAfter = await accBob.balancesOf([IToken.id]);
const teeAfter = await accTee.balancesOf([IToken.id]);

console.log('Alice Balance after the distribution',aliceAfter.toString(), IToken.sym);
console.log('Bob Balance after the distribution ',bobAfter.toString(), IToken.sym);
console.log('Tee Balance after the distribution',teeAfter.toString(), IToken.sym);

const mdA = await accAlice.tokenMetadata(IToken.id);
console.log('Token Name: ',mdA.name.toString())
console.log('Token Symbol: ',mdA.symbol.toString())
console.log('Supply: ',mdA.supply.toString())
console.log('Decimals: ',mdA.decimals.toString())




