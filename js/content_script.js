console.log("content-script");

function getFirstImg(){
    
    for (var i = 0, n = document.images.length; i < n; i++){

        if (document.images[i].offsetParent === null){
            continue;
        }

        if (document.images[i].width * document.images[i].height > 600*800){
            return document.images[i];
        } 

    }
    
    return undefined;
    
}

function getCoords(elem) { // crossbrowser version
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docEl = document.documentElement;

    var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    var clientTop = docEl.clientTop || body.clientTop || 0;
    var clientLeft = docEl.clientLeft || body.clientLeft || 0;

    var top  = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientTop;

    return { top: Math.round(top), left: Math.round(left) };
}


var img_prev = "";

window.onload = function(){

    

    var img = getFirstImg();

    if (img != undefined)
    {
    
        // css injection for the first page load
    
        // create a style element
        const style = document.createElement('style');
    
        // add the CSS as a string using template literals
        style.appendChild(document.createTextNode(`
        /* content box to prevent content breaking aspect ratio */
        div.overlayDIV {
            position: absolute;
            transform: translate(-50%, -50%);
        }
        div.overlayDIV:hover div.centerDIV {
            opacity: 0.0;
        }

        div.centerDIV {
            top: 50%;
            left: 50%;
            position: relative;
            transform: translate(-50%, -50%);
            text-align: start;
            color: black;
            background-color: white;
            background-clip: content-box;
        }
        `));
    
        // add it to the head
        const head = document.getElementsByTagName('head')[0];
        head.appendChild(style);
    
        // action for the first page load
        console.log("loaded");
        img_prev = img.src;
        chrome.storage.local.get(['load_button'], function(loaded_button_result) {
            
            chrome.storage.local.get(['load_busy'], function(loaded_busy_result) {
                if (loaded_button_result.load_button && !loaded_busy_result.load_busy){
    
                    chrome.runtime.sendMessage({ method: "BG_fetch", data: img.src});
                }
    
            });
        });
    
    
        // background script notify url change by messaging
        chrome.runtime.onMessage.addListener( function (message, sender, sendResponse) {
        
            if (message.method == 'cs_change'){
    
                img = getFirstImg();
    
                if ((img.complete && img.naturalWidth !== 0) || true) {
        
                    if (img_prev != img.src){
                        console.log("loaded");
                        console.log(img_prev);
                        console.log(img.src);
                        img_prev = img.src;
        
                        chrome.storage.local.get(['load_button'], function(loaded_button_result) {
                
                            chrome.storage.local.get(['load_busy'], function(loaded_busy_result) {
                                if (loaded_button_result.load_button && !loaded_busy_result.load_busy){
    
                                    prev_divs = img.parentElement.getElementsByClassName("overlayDIV")
    
                                    while(prev_divs[0]) {
                                        prev_divs[0].parentNode.removeChild(prev_divs[0]);
                                    }
        
                                    chrome.runtime.sendMessage({ method: "BG_fetch", data: img.src});
                                }
                
                            });
                        });
                    }
        
                }
    
            }
    
    
            if (message.method == 'cs_overlay'){
    
                // avoid text from prev img getting put on the current img
                if (message.url == img.src){
    
                    a_ele = img.parentElement;
    
                    parent_div = img.offsetParent;
    
                    //if (a_ele.nodeName == "A"){parent_div = a_ele.parentElement;}
    
                    let overlay_div = document.createElement('div');
                    overlay_div.className = 'overlayDIV';
    
                    let img_corner = getCoords(img);
    
                    let left_offset = img_corner.left - getCoords(parent_div).left;
                    let top_offset = img_corner.top - getCoords(parent_div).top;
    
                    


                    overlay_div.setAttribute("style","top:"+Math.round( top_offset + message.cy * img.height / img.naturalHeight )+"px;"
                        +"left:"+Math.round(left_offset + message.cx * img.width / img.naturalWidth + 3)+"px;"
                        +"max-width:"+Math.round(message.maxWidth*0.9)+"px;"
                        +"aspect-ratio:"+message.ratio.toFixed(2)+"/1;");
                    
                    let center_div = document.createElement('div');
                    center_div.className = 'centerDIV';




                    center_div.appendChild(document.createTextNode(message.text));
                    
                    let orient_string = "";
                    let magic_num = 1;

                    chrome.storage.local.get(['extraction_select'], function(extraction_select_result) 
                    {

                        if (message.lang == "yue" || message.lang == "zh-Hant" || message.lang == "zh-Hans")
                        {
                            magic_num = 0.9;

                                if (extraction_select_result.extraction_select == "lining"){
                                    orient_string = "writing-mode: vertical-rl; text-orientation: mixed;";
                                }

                        }
        
                        center_div.setAttribute(
                            "style", "font-size:" + Math.min(30, Math.round(Math.sqrt(message.maxWidth*message.maxWidth/message.ratio/message.text.length)*1.1*magic_num)) + "px;"
                            +orient_string
                        );
                        overlay_div.appendChild(center_div);
            
                        a_ele.append(overlay_div);

                    });
    
                }
    
            }
    
            
        });
        
    }
    
    
    



};





