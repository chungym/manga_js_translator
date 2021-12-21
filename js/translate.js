var count = 0;

function countMatches(str, regex){
    return ((str || '').match(regex) || []).length
}

async function postData(url = '', text, to, token, key) {
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        //'Content-Type': 'application/json'
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'origin-when-cross-origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: new URLSearchParams({
        'fromLang': 'ja',
        'text': text,
        'to': to,
        'token': token,
        'key': key
      }) // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
}
  

if (window.self !== window.top){

   console.log("translate script");

   count = 1;

   code = document.getElementsByTagName("html")[0].innerHTML;

   let results = code.match(/params_RichTranslateHelper\s\=\s\[([\s\w,\"\-]*)\]/g);
   var params = [];
   if (results === null){console.log(code)}
   for (i=0;i<results.length;i++) {
       value = results[i].match(/params_RichTranslateHelper\s\=\s\[([\s\w,\"\-]*)\]/);
       params = value[1].split(",");
   }

   let key = params[0];
   let token = params[1].replace(/\"/g,'');

   let iid = "";
   results = code.match(/div\sid\=\"rich_tta\"\sdata\-iid\=\"([\w.]*)\"/g);
   for (i=0;i<results.length;i++) {
       value = results[i].match(/div\sid\=\"rich_tta\"\sdata\-iid\=\"([\w.]*)\"/);
       iid = value[1]+"."+count.toString();
   }

   let IG = "";
   results = code.match(/IG\:\"([\w]*)\"/g);
   for (i=0;i<results.length;i++) {
       value = results[i].match(/IG\:\"([\w]*)\"/);
       IG = value[1];
   }

   
   console.log(key);
   console.log(token);
   console.log(iid);
   console.log(IG);

   var url = new URL('https://www.bing.com/ttranslatev3');
   var query = {
       isVertical: 1, 
       IG: IG,
       IID: iid
    };
    url.search = new URLSearchParams(query).toString();
  
    window.addEventListener('message', function(event) {
        
        let message = event.data;

        if (message.method == 'cs_translate'){

            chrome.storage.local.get(['lang_select'], function(result) {

                postData(url, message.text.replace(/\n/g,''), result.lang_select, token, key)
                .then(data => {
                console.log(data[0].translations[0].text); // JSON data parsed by `data.json()` call
                
                if ( 
                    ( (result.lang_select == "yue" || result.lang_select == "zh-Hant" || result.lang_select == "zh-Hans") && countMatches(data[0].translations[0].text, /[\p{sc=Han}]/gu) > 0 )
                    || (result.lang_select == "en" && countMatches(data[0].translations[0].text, /\w/g) > 0 ) 
                    || (result.lang_select != "yue" && result.lang_select != "zh-Hant" && result.lang_select != "zh-Hans" && result.lang_select != "en")
                )
                {
                    message.method = "BG_translate_results";
                    message.text = data[0].translations[0].text;
                    message.lang = result.lang_select;
                    chrome.runtime.sendMessage(message);
                }

            });


            });



        }

    });

}