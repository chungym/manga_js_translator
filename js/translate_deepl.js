

function countMatches(str, regex){
    return ((str || '').match(regex) || []).length
}

function simulateTextInput(text) {
    var el = document.getElementsByClassName("lmt__textarea lmt__source_textarea lmt__textarea_base_style")[0];
    el.value = text;
    var evt = document.createEvent("Events");
    evt.initEvent("change", true, true);
    el.dispatchEvent(evt);
}


if (window.self !== window.top){

    console.log("DeepL translate script");

    var toLang = "";
    var toLang_prev = "";

    var converter;

    // initial language setting
    chrome.storage.local.get(['lang_select'], function(result) {
        let lang_temp = result.lang_select;
        if (lang_temp == "yue" || lang_temp == "zh-Hans" || lang_temp == "zh-Hant")
        {
            toLang = 'zh';
        }
        else if (lang_temp == "en")
        {
            toLang = 'en';
        }

        // actual language change
        if (toLang != toLang_prev)
        {
            // inform background to redirect
            chrome.runtime.sendMessage({ method: "BG_change_deepl_lang", data: toLang});
            toLang_prev = toLang;

            if (lang_temp = "yue")
            {
                converter = OpenCC.Converter({ from: 'cn', to: 'hk' });
            } 
            else if (lang_temp = "zh-Hant")
            {
                converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            }

            console.log("initial deepL language is set to "+toLang);
        }
    });


    //listen to language change

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes)
        {
            if (key == "lang_select" )
            {
                if (changes[key].newValue == "yue" || changes[key].newValue == "zh-Hans" || changes[key].newValue == "zh-Hant")
                {
                    toLang = 'zh';
                }
                else if (changes[key].newValue == "en")
                {
                    toLang = 'en';
                }

                // actual language change
                if (toLang != toLang_prev)
                {
                    // inform background to redirect
                    chrome.runtime.sendMessage({ method: "BG_change_deepl_lang", data: toLang});
                    toLang_prev = toLang;


                    if (changes[key].newValue = "yue")
                    {
                        converter = OpenCC.Converter({ from: 'cn', to: 'hk' });
                    } 
                    else if (changes[key].newValue = "zh-Hant")
                    {
                        converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
                    }

                }
            }
        }
    });


    var outputTextArea = document.getElementById('target-dummydiv');


    const queue = async.queue((task, completed) => {
         
        var beforeText = outputTextArea.innerHTML;

        simulateTextInput(task.message.text.replace(/\n/g,''));

        const remaining = queue.length();

        var time_elapsed = 0;

        var id = setInterval(function()
        {
            let temp = outputTextArea.cloneNode(true);

            time_elapsed = time_elapsed + 100;

            const afterText = temp.innerHTML;

            if(afterText != beforeText)
            {
                clearInterval(id);

                if ( 
                    ( (task.toLang == "yue" || task.toLang == "zh-Hant" || task.toLang == "zh-Hans") && countMatches(afterText, /[\p{sc=Han}]/gu) > 0 )
                    || (task.toLang == "en" && countMatches(afterText, /\w/g) > 0 ) 
                    || (task.toLang != "yue" && task.toLang != "zh-Hant" && task.toLang != "zh-Hans" && task.toLang != "en")
                )
                {
                    task.message.method = "BG_translate_results";
                    if (task.toLang == "yue" || task.toLang == "zh-Hant" ){task.message.text = converter(afterText);}
                    else {task.message.text = afterText;}
                    task.message.lang = task.toLang;
                    chrome.runtime.sendMessage(task.message);
                }
    
                completed(null, {task, remaining});
            }

            else if (time_elapsed > 5000)
            {
                clearInterval(id);
                completed("timeout", {task, remaining});
            }

        }, 100);
     
    }, 1);



    window.addEventListener('message', function(event) {
        
        let message = event.data;

        return new Promise( (resolve, reject) => {

            if (message.method == 'cs_translate'){

                chrome.storage.local.get(['lang_select'], function(result) {


                queue.push({message: message, toLang: result.lang_select}, (error, {task, remaining})=>{
                    if(error){
                     console.log('An error occurred while processing task ${task.message.text}');
                    }else {
                     //console.log('Finished processing task ${task}. ${remaining} tasks remaining');
                   }
                   })

                });

            }

        });

    });



}