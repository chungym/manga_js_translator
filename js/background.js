console.log("bg script");


var scheduler;
const { createWorker, createScheduler } = Tesseract;


chrome.storage.local.set({load_button: false}, function(){});
chrome.storage.local.set({load_busy: false}, function(){});
chrome.storage.local.set({lang_select: 'en'}, function(){});
chrome.storage.local.set({translator_select: 'deepl'}, function(){});
chrome.storage.local.set({extraction_select: 'balloon'}, function(){});

chrome.webRequest.onHeadersReceived.addListener(info => {
  const headers = info.responseHeaders; // original headers
  for (let i=headers.length-1; i>=0; --i) {
      let header = headers[i].name.toLowerCase();
      if (header === "content-security-policy") { // csp header is found
          // modifying frame-ancestors; this implies that the directive is already present
          headers[i].value = headers[i].value.replace("frame-ancestors", "frame-ancestors chrome-extension://*");
      }
  }
  // return modified headers
  return {responseHeaders: headers};
}, {
  urls: [ "https://www.deepl.com/*" ], // match all pages
  types: [ "sub_frame" ] // for framing only
}, ["blocking", "responseHeaders"]);


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tabInfo) {
  
    if ( changeInfo.status == 'complete')
    (async () => {

        setTimeout(function(){ chrome.tabs.sendMessage(tabId, {method: "cs_change"}); }, 500);
   
    })();

});



chrome.runtime.onMessage.addListener( handleMessage );

function handleMessage(message, sender, sendResponse) {
  switch (message.method) {
    /*
      CONTENT PAGE COMMUNICATION
    */
    case "BG_load_workers":
      if (message.data == "load"){loadWorkers();}
      if (message.data == "unload"){terminateWorkers();}
      break

    case "BG_fetch":
      fetchImg(message.data, sender.tab.id);
      break

    case "BG_recognize_bubble":
      extractImg(message.data);
      break

    case "BG_recognize":
      OCR(message.data);
      break

    case "BG_translate_results":
      //console.log(message);
      message.method = "cs_overlay";
      chrome.tabs.sendMessage(message.tabID, message);
      break

    case "BG_change_translator":
      if (message.data == 'deepl')
      {
        document.getElementById('translate_frame').src = "https://www.deepl.com/translator";
      }
      else if (message.data == 'bing')
      {
        document.getElementById('translate_frame').src = "https://www.bing.com/translator";
      }
      break

    case "BG_change_deepl_lang":
      document.getElementById('translate_frame').src = "https://www.deepl.com/translator#ja/"+message.data+"/";
      break

    case "BG_Options":
      chrome.runtime.openOptionsPage()
      break
     
  }
}

function loadWorkers(){               
  
  scheduler = createScheduler();

  option = {
    workerPath: 'js/worker.min.js',
    langPath: './traineddata',
    corePath: 'js/tesseract-core.wasm.js',
    cacheMethod: 'none',
    // CRITICAL (Content Security Policy): workerBlobURL must be set to false
    // The page's settings blocked the loading of a resource at blob:moz-extension:// .../... ("script-src").
    // Check: spawnWorker.js
    // https://github.com/naptha/tesseract.js/issues/219
    //  > https://github.com/naptha/tesseract.js/pull/322
    // https://github.com/gnonio/korporize/blob/master/background.js
    workerBlobURL: false,
  };

  (async () => {

    await chrome.storage.local.set({load_busy: true});

    //await chrome.storage.local.set({load_busy: true}, function(){});

    // reload iframe, because the page may timeout
    if (document.getElementById('translate_frame').src == ""){
      document.getElementById('translate_frame').src = "https://www.deepl.com/translator#ja/en/";
    }
    else
    {
      document.getElementById('translate_frame').src = document.getElementById('translate_frame').src;
    }

    for (let i = 0; i < 5; i++) {
      const w = createWorker(option);
      await w.load();
      await w.loadLanguage('jpn_vert_alt');
      await w.initialize('jpn_vert_alt');
      await w.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT,
        tessedit_ocr_engine_mode: Tesseract.OEM.OEM_LSTM_ONLY
      });
      await scheduler.addWorker(w);
    }

    await chrome.storage.local.set({load_busy: false});
    console.log('worker loaded');

  })();

}


function terminateWorkers(){

  (async () => {

  await chrome.storage.local.set({load_busy: true});

  await scheduler.terminate();
  console.log('worker unloaded');

  await chrome.storage.local.set({load_busy: false});

  })();

}


function OCR(dataURL_array, tabID, url){

  console.log("OCR");

  (async () => {

    var iframe = document.getElementById('translate_frame');
    for (let i = 0; i < dataURL_array.length; i++) { 

      scheduler.addJob('recognize', dataURL_array[i].dataURL).then( (result) => {

        console.log(result);  

        chrome.storage.local.get(['extraction_select'], function(value){

          if ( (result.data.confidence >= 75 && value.extraction_select == 'balloon') || (result.data.confidence >= 60 && value.extraction_select == 'lining') ){
            //console.log(result);  
            iframe.contentWindow.postMessage({
              method: "cs_translate", 
              text: result.data.text,
              cx: dataURL_array[i].cx,
              cy: dataURL_array[i].cy,
              ratio: dataURL_array[i].ratio,
              maxWidth: dataURL_array[i].maxWidth,
              tabID: tabID,
              url: url
            },"*");
          }

        });

      });

    }

  })();
}


function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}


function fetchImg(url, tabID){

  fetch(url)
  .then(response => response.blob())
  .then(imageBlob => {

      blobToBase64(imageBlob).then((dataURL)=>{

        extractImg_bubble(dataURL, tabID, url);

      });

  });

}

function extractImg_bubble(dataURL, tabID, url){

  var inCanvas = document.getElementById('canvas_in');
  var outCanvas = document.getElementById('canvas_out');
  var ctx = inCanvas.getContext('2d');
  var img = new Image;

  img.addEventListener('load', e => {

    inCanvas.width = img.width;
    inCanvas.height = img.height;

    ctx.drawImage(img,0,0);
    
    chrome.storage.local.get(['extraction_select'], function(result){

      let dataURL_array = [];
      if (result.extraction_select == 'balloon') {
        dataURL_array = cv_extract_dataURL(outCanvas);
      }
      else if (result.extraction_select == 'lining')
      {
        dataURL_array = cv_extract_dataURL_lining(outCanvas);
      }
      
      inCanvas.getContext('2d').clearRect(0, 0, inCanvas.width, inCanvas.height);
      outCanvas.getContext('2d').clearRect(0, 0, outCanvas.width, outCanvas.height);

      //var in_dataURL = inCanvas.toDataURL('image/jpeg');
      //console.log(in_dataURL);

      OCR(dataURL_array, tabID, url);
    });

  });

  img.src = dataURL;
  

}


