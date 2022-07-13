'reach 0.1';

const commonFunctions = {
  seeNotification : Fun([Bool],Null),
  attacherMatched : Fun([Bool],Null),
};

export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...commonFunctions,
    tokenDetails : Fun([], Tuple(Token, UInt, UInt)),
    attacherMatched1 :Fun([Bool],Null),
    aliceAdd : Fun([], Address), 
    aliceAdd2 : Fun([], Address)   
  });
  const Bob = Participant('Bob', {
    ...commonFunctions,
    ready : Fun([Token, UInt], Bool)
  });
  const Tee = Participant('Tee', {
    ...commonFunctions,
    attacherMatched1 : Fun([Bool],Null),
    ready1 : Fun([Token, UInt], Bool)
    
  });
  init();
  
  Alice.only(() => {
    const [IToken, IAmt, time] = declassify(interact.tokenDetails());
    check(IToken != IAmt);
    
  });
  
  Alice.publish(IToken, IAmt, time);
  
  commit();
  
  Bob.only(() => {
    const ready = declassify(interact.ready(IToken, IAmt))
  });
  Bob.publish(ready);
  commit();

  Tee.only(() => {
    const ready1 = declassify(interact.ready1(IToken,IAmt))
  });
  Tee.publish(ready1);

  const transferWho = new Set();
  transferWho.insert(Tee);
  commit();

  if(ready && ready1)
    each([Alice, Bob, Tee], () => interact.seeNotification(ready));

  Alice.pay([[IAmt, IToken]])
  .when(ready)
  .timeout(relativeTime(time), () => {
    Alice.publish();
   
    
    commit();
    exit();
  });

  commit();

  Alice.only(() => {
    const aliceAddress = declassify(interact.aliceAdd());
    const teeAddress = declassify(interact.aliceAdd2());
  })
  
  Alice.publish(aliceAddress, teeAddress);
  
  if(transferWho.member(aliceAddress) && !transferWho.member(teeAddress)){
    each([Alice, Bob], () => interact.attacherMatched(true));
    each([Alice, Tee], () => interact.attacherMatched1(false));
    
    transfer(IAmt, IToken).to(Bob);    
  }else if(!transferWho.member(aliceAddress) && transferWho.member(teeAddress)) {
    each([Alice, Tee], () => interact.attacherMatched1(true));
    each([Alice, Bob], () => interact.attacherMatched(false));

    transfer(IAmt, IToken).to(Tee);
  }
  else{
    each([Alice, Tee], () => interact.attacherMatched1(false));
    each([Alice, Bob], () => interact.attacherMatched(false));
    transfer(IAmt, IToken).to(Alice);

  }
  commit();
  exit();
});