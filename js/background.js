console.log("bg script");


var scheduler;
const { createWorker, createScheduler } = Tesseract;

var loader_ready = false;

chrome.runtime.onInstalled.addListener(async () => {

  chrome.storage.local.set({load_button: false}, function(){});
  chrome.storage.local.set({load_busy: false}, function(){});
  chrome.storage.local.set({lang_select: 'en'}, function(){});
  
});




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
      if (loader_ready)
      {
        fetchImg(message.data, sender.tab.id);
      }
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

    case "BG_kOptions":
      chrome.runtime.openOptionsPage()
      break
  }
}

function loadWorkers(){               
  
  scheduler = createScheduler();

  option = {
    workerPath: 'js/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
    corePath: 'js/tesseract-core.wasm.js',
    cacheMethod: 'write',
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
      document.getElementById('translate_frame').src = "https://www.bing.com/translator/";
    }
    else
    {
      document.getElementById('translate_frame').src = document.getElementById('translate_frame').src;
    }

    for (let i = 0; i < 5; i++) {
      const w = createWorker(option);
      await w.load();
      await w.loadLanguage('jpn_vert');
      await w.initialize('jpn_vert');
      await w.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT,
      });
      await scheduler.addWorker(w);
    }

    await chrome.storage.local.set({load_busy: false});
    loader_ready = true;
    console.log('worker loaded');

  })();

}


function terminateWorkers(){

  loader_ready = false;
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
        if (result.data.confidence > 55){
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

  var debug_plot = false;

  var inCanvas = document.getElementById('canvas_in');
  var outCanvas = document.getElementById('canvas_out');
  var outCanvas2 = document.getElementById('canvas_out2');
  var ctx = inCanvas.getContext('2d');
  var img = new Image;

  img.addEventListener('load', e => {

    inCanvas.width = img.width;
    inCanvas.height = img.height;

    ctx.drawImage(img,0,0);


    
    let src = cv.imread('canvas_in');
    let bw = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let inter = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let contours_large = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(255,255,255));
    let mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    
    cv.threshold(src, bw, 125, 255, cv.THRESH_OTSU);
    
    let M = cv.Mat.ones(2, 2, cv.CV_8U);
    let M2 = cv.Mat.ones(5, 5, cv.CV_8U);
    let anchor = new cv.Point(-1, -1);
    //cv.morphologyEx(src, inter, cv.MORPH_OPEN, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.erode(bw, inter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    //cv.dilate(inter, inter, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(inter, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    
    //draw back large contours to original image
    // to close large contours

    for (let i = 0; i < contours.size(); ++i) {
      if (hierarchy.intPtr(0,i)[2] !=-1){
    
        let perimeter = cv.arcLength(contours.get(i), true);
        if ( perimeter >= (src.rows + src.cols)*0.10){

          cv.drawContours(contours_large , contours, i, new cv.Scalar(0, 0, 0), 1, cv.LINE_8, hierarchy, 0, new cv.Point(0,0));
    
        }
      }
    }
    cv.erode(contours_large, contours_large, M2, anchor, 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(contours_large, contours_large, M2, anchor, 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.bitwise_and(inter, contours_large, inter);


    cv.findContours(inter, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);


      
      let matVecTemp = new cv.MatVector();
      matVecTemp.push_back(inter);
      matVecTemp.push_back(inter);
      matVecTemp.push_back(inter);
      cv.merge(matVecTemp, dst)
      matVecTemp.delete();
      

    let bubbleContours = new cv.MatVector();
    for (let i = 0; i < contours.size(); ++i) {


      //check nesting

      if (hierarchy.intPtr(0,i)[2] !=-1){

        if (debug_plot){
          cv.drawContours(dst, contours, i, new cv.Scalar(255, 0, 0), 1, cv.LINE_8, hierarchy, 0);
        }
    
        let perimeter = cv.arcLength(contours.get(i), true);
        if ( perimeter >= (src.rows + src.cols)*0.10){

          if (debug_plot){
            cv.drawContours(dst, contours, i, new cv.Scalar(255, 0, 255), 1, cv.LINE_8, hierarchy, 0);
          }
      
          let area = cv.contourArea(contours.get(i), false);
          let rect = cv.boundingRect(contours.get(i));
          let rectArea = rect.width * rect.height;
          let extent = area / rectArea;


          let areaRatio = area/ (src.rows*src.cols);
          
          //check size
          if (areaRatio>0.0025 && rectArea/ (src.rows*src.cols) <0.2){

            if (debug_plot)
            {
              cv.drawContours(dst, contours, i, new cv.Scalar(0, 0, 255), 1, cv.LINE_8, hierarchy, 0);
            }

            let hull = new cv.Mat();
    
            cv.convexHull(contours.get(i), hull, false, true);
            let hullPerimeter = cv.arcLength(hull , true);
    
            //check convexity
            if ( (true || extent > 0.33)  && ( (perimeter < 1.5* hullPerimeter && areaRatio > 0.01) || (perimeter < 1.33* hullPerimeter && areaRatio > 0.005 && areaRatio < 0.01) || (perimeter < 1.10* hullPerimeter && areaRatio <= 0.005) ) ){
    
              let color = new cv.Scalar(255, 255, 255);

              cv.drawContours(mask , contours, i, color, 1, cv.LINE_8, hierarchy, 0, new cv.Point(-1,-1));

              if (debug_plot){
              
                cv.drawContours(dst, contours, i, new cv.Scalar(0, 255, 0), 1, cv.LINE_8, hierarchy, 0);

              }
            }

            hull.delete();
          }
        }
      }

     
    }
    
    cv.findContours(mask, bubbleContours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    //bubbleContours.push_back(contours.get(i));


    let dataULR_array = [];
    if (bubbleContours.size() > 0){
    

      for (let i = bubbleContours.size()-1; i >= 0; i--) {


        if (hierarchy.intPtr(0,i)[2] ==-1){

          let rect = cv.boundingRect(bubbleContours.get(i));
          let roi_mask = cv.Mat.zeros(rect.height, rect.width, cv.CV_8UC1);
          let roi_mask_inv = new cv.Mat();
          let color = new cv.Scalar(255, 255, 255);
          cv.drawContours(roi_mask , bubbleContours, i, color, -1, cv.LINE_8, hierarchy, 0, new cv.Point(-rect.x,-rect.y));
          cv.erode(roi_mask, roi_mask, M2, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
          cv.bitwise_not(roi_mask, roi_mask_inv);

          let bw_roi = bw.roi(rect).clone();
          let roi = new cv.Mat();
          cv.bitwise_and(bw_roi, roi_mask, roi);
          cv.bitwise_or(roi, roi_mask_inv, roi);


          let black_ratio = (rect.width * rect.height - cv.countNonZero(roi)) / cv.contourArea(bubbleContours.get(i), false);
          if (debug_plot){
            console.log(black_ratio );
          }

          if (black_ratio > 0.015 && black_ratio < 0.333 ){
            //const outBase64 =  cv.imencode('.jpg', roi).toString('base64'); // Perform base64 encoding
            //const dataURL='data:image/jpeg;base64,'+outBase64; //Create insert into HTML compatible <img> tag
            
        
            let src_roi = bw.roi(rect).clone();
            cv.bitwise_and(src_roi, roi_mask, src_roi);
            cv.bitwise_or(src_roi, roi_mask_inv, src_roi);

            cv.imshow('canvas_out', src_roi);
            let out_dataURL = outCanvas.toDataURL('image/jpeg');

            let Moments = cv.moments(bubbleContours.get(i), false);

            let dataURL_obj = {
              dataURL: out_dataURL, 
              cx: Moments.m10/Moments.m00, 
              cy: Moments.m01/Moments.m00, 
              ratio: rect.width/rect.height,
              maxWidth: rect.width
            };

            dataULR_array.push(dataURL_obj);

            src_roi.delete();
        
            if (debug_plot){
              console.log(out_dataURL);
            }
          }

          roi_mask.delete(); roi_mask_inv.delete(); bw_roi.delete(); roi.delete();
        }
      }

    }
    
    
    if (debug_plot){
      cv.imshow('canvas_out', dst);
      var out_dataURL = outCanvas.toDataURL('image/jpeg');
      console.log(out_dataURL);

      cv.imshow('canvas_out2', mask);
      var out_dataURL2 = outCanvas2.toDataURL('image/jpeg');
      console.log(out_dataURL2);
    }

    src.delete(); bw.delete(); contours_large.delete(); mask.delete(); inter.delete(); dst.delete(); 
    M.delete(); M2.delete(); 
    contours.delete(); bubbleContours.delete(); hierarchy.delete();
    inCanvas.getContext('2d').clearRect(0, 0, inCanvas.width, inCanvas.height);
    outCanvas.getContext('2d').clearRect(0, 0, outCanvas.width, outCanvas.height);
    outCanvas2.getContext('2d').clearRect(0, 0, outCanvas2.width, outCanvas2.height);
    

    //var in_dataURL = inCanvas.toDataURL('image/jpeg');
    //console.log(in_dataURL);

    OCR(dataULR_array, tabID, url);

  });

  img.src = dataURL;
  

}


