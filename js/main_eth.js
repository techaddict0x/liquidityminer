var modal
var modalContent
var lastNumEggs=-1
var lastNumMiners=-1
var lastSecondsUntilFull=100
lastHatchTime=0
var eggstohatch1=2592000
var lastUpdate=new Date().getTime()
var modalID=0
var baseNum = '';
var currentAddr = '';
var spend;
var usrBal;

window.addEventListener('load', async function() {
    if (window.ethereum) {
      window.web3 = new Web3(ethereum);
      try {
        await ethereum.enable() // Request access
        minersContract = await new web3.eth.Contract(minersAbi, minersAddr)
        tokenContract = await new web3.eth.Contract(tokenAbi, tokenAddr)
        let accounts = await web3.eth.getAccounts()
        currentAddr = accounts[0]
        setTimeout(function(){
            controlLoop()
            controlLoopFaster()
        },1000);
      } catch (error) {
          // User denied account access...
          console.error(error)
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      window.web3 = new Web3(web3.currentProvider);
      minersContract = await new web3.eth.Contract(minersAbi, minersAddr)
      tokenContract = await new web3.eth.Contract(tokenAbi, tokenAddr)
      let accounts = await web3.eth.getAccounts()
      currentAddr = accounts[0]
      setTimeout(function(){
          controlLoop()
          controlLoopFaster()
      },1000);
    }

    var ref1 = document.getElementById('ref-link');
    var key = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
    var encr = CryptoJS.AES.encrypt(currentAddr, key, { mode: CryptoJS.mode.ECB });
    //var decr = CryptoJS.AES.decrypt(encr.toString(), key, { mode: CryptoJS.mode.ECB }).toString(CryptoJS.enc.Utf8);
    ref1.textContent=window.location.origin+"/index.html?ref=" + "XX" + encr.toString();
})

function copyToClipboard(element) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).text()).select();
    document.execCommand("copy");
    $temp.remove();
    //alert("Copied:\n"+ window.location.origin+"?ref="+currentAddr);
}


function approve() {
    var trxspenddoc=document.getElementById('spend-allowance')
    approveBUSD(web3.utils.toWei(trxspenddoc.value));
}

function controlLoop(){
    refreshData()
    setTimeout(controlLoop,2500)
}
function controlLoopFaster(){
    liveUpdateEggs()
    // liveUpdatePeers()
    setTimeout(controlLoopFaster,30)
}

function stripDecimals(str, num){
	if (str.indexOf('.') > -1){
		var left = str.split('.')[0];
		var right = str.split('.')[1];
		return left + '.' + right.slice(0,num);
	}
	else {
		return str;
	}
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function refreshData(){

    spendLimit(function(result){
        var raw=web3.utils.fromWei(result);
        spend=raw;
        console.log("spend limit=" + spend);
    });

    var balanceElem = document.getElementById('contract-balance');
    var baseNum = 0;
    contractBalance(function(result){
        rawStr = numberWithCommas(Number(result).toFixed(3));
        balanceElem.textContent = stripDecimals(rawStr, 3) + ' PEPE';
    });

    var userBalanceElem = document.getElementById('user-balance');
    userBalance(function(result){
        rawStr = numberWithCommas(Number(result).toFixed(3));
        userBalanceElem.textContent = stripDecimals(rawStr, 3) + ' PEPE';
    });

    lastHatch(currentAddr,function(lh){
        lastHatchTime=lh
    });
    getMyEggs(function(eggs){
        if(lastNumEggs!=eggs){
            lastNumEggs=eggs
            lastUpdate=new Date().getTime()
            updateEggNumber(eggs/eggstohatch1)
        }
        var timeuntilfulldoc=document.getElementById('until-full')
        secondsuntilfull=eggstohatch1-eggs/lastNumMiners
        lastSecondsUntilFull=secondsuntilfull
        timeuntilfulldoc.textContent=secondsToString(secondsuntilfull)
        if(lastNumMiners==0){
            timeuntilfulldoc.textContent='?'
        }
    });
    getMyMiners(function(miners){
        lastNumMiners=miners
        var allnumminers=document.getElementsByClassName('num-miners')
        for(var i=0;i<allnumminers.length;i++){
            if(allnumminers[i]){
                allnumminers[i].textContent=translateQuantity(miners)
            }
        }
        var productiondoc=document.getElementById('production-rate')
        productiondoc.textContent=formatEggs(lastNumMiners*60*60)
    });
    updateBuyPrice()
    updateSellPrice()
}
function updateEggNumber(eggs){
    var hatchminersquantitydoc=document.getElementById('hatchminersquantity')
    hatchminersquantitydoc.textContent=translateQuantity(eggs,0)
    var allnumeggs=document.getElementsByClassName('num-miners')
    for(var i=0;i<allnumeggs.length;i++){
        if(allnumeggs[i]){
            allnumeggs[i].textContent=translateQuantity(eggs,3)
        }
    }
}
function hatchEggs1(){
    ref=getQueryVariable('ref')
    if (!web3.utils.isAddress(ref)){
        ref=currentAddr
    }
    hatchEggs(ref,displayTransactionMessage)
}
function liveUpdateEggs(){
    if(lastSecondsUntilFull>1 && lastNumEggs>=0 && lastNumMiners>0 && eggstohatch1>0){
        currentTime=new Date().getTime()
        if(currentTime/1000-lastHatchTime>eggstohatch1){
            return;
        }
        difference=(currentTime-lastUpdate)/1000
        additionalEggs=Math.floor(difference*lastNumMiners)
        updateEggNumber(((lastNumEggs*1)+additionalEggs)/eggstohatch1)
    }
}
function updateSellPrice(){
  var eggstoselldoc=document.getElementById('sell-price')
   getMyEggs(function(eggs){
        if (eggs > 0) {
            calculateEggSell(eggs,function(sun){
                devFee(sun,function(fee){
                    eggstoselldoc.textContent=formatTrxValue(web3.utils.fromWei(sun) - web3.utils.fromWei(fee))
                });
            });
        }
   });
}

function updateBuyPrice(){
    //var eggstobuydoc1=document.getElementById('eggs-to-buy-1')
    var eggstobuydoc2=document.getElementById('eggs-to-buy-2')

    var trxspenddoc=document.getElementById('eth-to-spend')
    calculateEggBuySimple(web3.utils.toWei(trxspenddoc.value),function(eggs){
        devFee(eggs,function(fee){
           // eggstobuydoc1.textContent=formatEggs(eggs-fee)
            eggstobuydoc2.textContent=formatEggs(eggs-fee)
        });
    });
}
function buyEggs2(){
    var trxspenddoc=document.getElementById('eth-to-spend')
    ref=getQueryVariable('ref')

    console.log("REF:" + ref);

    if(ref)
    {
       if (ref.substring(0, 2) == "XX") {
          ref = ref.substring(2);
          console.log(ref);
          var key = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
          ref = CryptoJS.AES.decrypt(ref.toString(), key, { mode: CryptoJS.mode.ECB }).toString(CryptoJS.enc.Utf8);
          console.log(ref);
       }

    }

    if (!web3.utils.isAddress(ref)){
        ref=currentAddr
    }
    console.log('hatcheggs ref ',ref)
    buyEggs(ref, trxspenddoc.value, function(){
        displayTransactionMessage();
    });
}
function formatEggs(eggs){
    return translateQuantity(eggs/eggstohatch1,3)
}
function findBaseNum(num){
    var ret = 0
    if(num>1000000){
        ret = 1000000
    }
    if(num>1000000000){
        ret = 1000000000
    }
    if(num>1000000000000){
        ret = 1000000000000
    }
    if(num>1000000000000000){
        ret = 1000000000000000
    }
    if(num>1000000000000000000){
        ret = 1000000000000000000
    }
    if(num>1000000000000000000000){
        ret = 1000000000000000000000
    }
    if(num>1000000000000000000000000){
        ret = 1000000000000000000000000
    }
    if(num>1000000000000000000000000000){
        ret = 1000000000000000000000000000
    }
    if(num>1000000000000000000000000000000){
        ret = 1000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    return ret;
}
function findBaseText(num){
    var ret = ''
    if(num>1000000){
        ret = 'Million'
    }
    if(num>1000000000){
        ret = 'Billion'
    }
    if(num>1000000000000){
        ret = 'Trillion'
    }
    if(num>1000000000000000){
        ret = 'Quadrillion'
    }
    if(num>1000000000000000000){
        ret = 'Quintillion'
    }
    if(num>1000000000000000000000){
        ret = 'Sextillion'
    }
    if(num>1000000000000000000000000){
        ret = 'Septillion'
    }
    if(num>1000000000000000000000000000){
        ret = 'Octillion'
    }
    if(num>1000000000000000000000000000000){
        ret = 'Nonillion'
    }
    if(num>1000000000000000000000000000000000){
        ret = 'Decillion'
    }
    if(num>1000000000000000000000000000000000000){
        ret = 'Undecillion'
    }
    if(num>1000000000000000000000000000000000000000){
        ret = 'Duodecillion'
    }
    if(num>1000000000000000000000000000000000000000000){
        ret = 'Tredecillion'
    }
    if(num>1000000000000000000000000000000000000000000000){
        ret = 'Quattuordecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000){
        ret = 'Quindecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000){
        ret = 'Sexdecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000){
        ret = 'Septendecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000){
        ret = 'Octodecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000){
        ret = 'Novemdecillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Vigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Unvigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Duovigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Trevigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Quattuorvigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Quinvigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Sexvigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Septenvigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Octovigintillion'
    }
    if(num>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        ret = 'Novemvigintillion'
    }
    return ret;
}
function checkMarketEggsVal(quantity){
    quantity=Number(quantity)
    modifier = ' Quattuorvigintillion'
    finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000;
    if (finalquantity > 1) {
        return finalquantity.toFixed(1)+modifier;
    } else {
        return finalquantity.toFixed(5)+modifier;
    }
}
function translateQuantity(quantity,precision){
    quantity=Number(quantity)
    finalquantity=quantity
    modifier=''

    if (quantity < 1e6) {
      return numberWithCommas((quantity).toFixed(2));
    }

    //console.log('??quantity ',typeof quantity)
    if(quantity>1000000){
        modifier=' Million'
        finalquantity=quantity/1000000
    }
    if(quantity>1000000000){
        modifier=' Billion'
        finalquantity=quantity/1000000000
    }
    if(quantity>1000000000000){
        modifier=' Trillion'
        finalquantity=quantity/1000000000000
    }
    if(quantity>1000000000000000){
        modifier=' Quadrillion'
        finalquantity=quantity/1000000000000000
    }
    if(quantity>1000000000000000000){
        modifier=' Quintillion'
        finalquantity=quantity/1000000000000000000
    }
    if(quantity>1000000000000000000000){
        modifier=' Sextillion'
        finalquantity=quantity/1000000000000000000000
    }
    if(quantity>1000000000000000000000000){
        modifier=' Septillion'
        finalquantity=quantity/1000000000000000000000000
    }
    if(quantity>1000000000000000000000000000){
        modifier=' Octillion'
        finalquantity=quantity/1000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000){
        modifier=' Nonillion'
        finalquantity=quantity/1000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000){
        modifier=' Decillion'
        finalquantity=quantity/1000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000){
        modifier = ' Undecillion'
        finalquantity=quantity/1000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000){
        modifier = ' Duodecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000){
        modifier = ' Tredecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000){
        modifier = ' Quattuordecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000){
        modifier = ' Quindecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000){
        modifier = ' Sexdecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000){
        modifier = ' Septendecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000){
        modifier = ' Octodecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Novemdecillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Vigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Unvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Duovigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Trevigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Quattuorvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Quinvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Sexvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Septenvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Octovigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(quantity>1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000){
        modifier = ' Novemvigintillion'
        finalquantity=quantity/1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    }
    if(precision == undefined){
        precision=0
        if(finalquantity<10000){
            precision=1
        }
        if(finalquantity<1000){
            precision=2
        }
        if(finalquantity<100){
            precision=3
        }
        if(finalquantity<10){
            precision=4
        }
    }
    if(precision==0){
        finalquantity=Math.floor(finalquantity)
    }
    return finalquantity.toFixed(precision)+modifier;
}
function removeModal2(){
    $('#adModal').modal('toggle');
}
function removeModal(){
        modalContent.innerHTML=""
        modal.style.display = "none";
}
function displayTransactionMessage(){
    displayModalMessage("Transaction Submitted")
}
function displayModalMessage(message){
    modal.style.display = "block";
    modalContent.textContent=message;
    setTimeout(removeModal,3000)
}
function formatTrxValue(trxstr){
    return parseFloat(parseFloat(trxstr).toFixed(4));
}
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}
function secondsToString(seconds)
{
    seconds=Math.max(seconds,0)
    var numdays = Math.floor(seconds / 86400);

    var numhours = Math.floor((seconds % 86400) / 3600);

    var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);

    var numseconds = ((seconds % 86400) % 3600) % 60;
    var endstr=""

    return numhours + "h " + numminutes + "m "//+numseconds+"s";
}
function disableButtons(){
    var allnumminers=document.getElementsByClassName('btn-lg')
    for(var i=0;i<allnumminers.length;i++){
        if(allnumminers[i]){
            allnumminers[i].style.display="none"
        }
    }
    var allnumminers=document.getElementsByClassName('btn-md')
    for(var i=0;i<allnumminers.length;i++){
        if(allnumminers[i]){
            allnumminers[i].style.display="none"
        }
    }
}
function enableButtons(){
    var allnumminers=document.getElementsByClassName('btn-lg')
    for(var i=0;i<allnumminers.length;i++){
        if(allnumminers[i]){
            allnumminers[i].style.display="inline-block"
        }
    }
        var allnumminers=document.getElementsByClassName('btn-md')
    for(var i=0;i<allnumminers.length;i++){
        if(allnumminers[i]){
            allnumminers[i].style.display="inline-block"
        }
    }
}
function onlyLetters(text){
    return text.replace(/[^0-9a-zA-Z\s\.!?,]/gi, '')
}
function checkOnlyLetters(str){
    var pattern=new RegExp('^[0-9a-zA-Z\s\.!?,]*$')
      if(!pattern.test(str)) {
        return false;
      } else {
        return true;
      }
}
function onlyurl(str){
     return str.replace(/[^0-9a-zA-Z\.?&\/\+#=\-_:]/gi, '')
}
function validurlsimple(str){
    var pattern=new RegExp('^[a-z0-9\.?&\/\+#=\-_:]*$')
      if(!pattern.test(str)) {
        return false;
      } else {
        return true;
      }
}
function ValidURL(str) {
  var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
    '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
    '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
    '(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
    '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
    '(\#[-a-z\d_]*)?$','i'); // fragment locater
  if(!pattern.test(str)) {
    alert("Please enter a valid URL.");
    return false;
  } else {
    return true;
  }
}
function callbackClosure(i, callback) {
    return function() {
        return callback(i);
    }
}
