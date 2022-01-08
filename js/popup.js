window.onload = function () {

    var load_button = document.getElementById('load_button');
    var lang_select = document.getElementById('langs');
    var check_mark = document.getElementById('check');
    var trans_engine_select = document.getElementById('translators');
    var extraction_select = document.getElementById('extraction');

    chrome.storage.local.get(['lang_select'], function(result) {
        lang_select.value = result.lang_select;
    });


    chrome.storage.local.get(['translator_select'], function(result) {
        trans_engine_select.value = result.translator_select;
    });


    chrome.storage.local.get(['extraction_select'], function(result) {
        extraction_select.value = result.extraction_select;
    });


    chrome.storage.local.get(['load_button'], function(loaded_button_result) {
        load_button.checked = loaded_button_result.load_button;
        chrome.storage.local.get(['load_busy'], function(result) {
            if (!result.load_busy && loaded_button_result.load_button){check_mark.style.display = "block";}
        });
    });

    load_button.onclick = function () {

        chrome.storage.local.set({"load_button": load_button.checked}, function() {
            console.log('Value is set to ' + load_button.checked);
        });

        if (load_button.checked){chrome.runtime.sendMessage({ method: "BG_load_workers", data: "load"});}
        if (!load_button.checked){chrome.runtime.sendMessage({ method: "BG_load_workers", data: "unload"});}

    };


    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes)
        {
            if (key == "load_busy" )
            {
                if (changes[key].newValue == true){
                    load_button.disabled = true;
                    check_mark.style.display = "none";
                }
                if (changes[key].newValue == false){
                    load_button.disabled = false;
                    chrome.storage.local.get(['load_button'], function(result) {
                        if (result.load_button){check_mark.style.display = "block";}
                    });
                }
            }

        }
    });

    lang_select.onchange = changeLang;

    function changeLang(e){  
        var value = e.target.value;  
        chrome.storage.local.set({"lang_select": value}, function() {
            console.log('Lang is set to ' + value);
        });
    }


    trans_engine_select.onchange = changeTranslator;

    function changeTranslator(e){  
        var value = e.target.value;  

        chrome.storage.local.set({"translator_select": value}, function() {
        });
        

        chrome.runtime.sendMessage({ method: "BG_change_translator", data: value});
    }


    extraction_select.onchange = changeExtraction;

    function changeExtraction(e){  
        var value = e.target.value;  

        chrome.storage.local.set({"extraction_select": value}, function() {
        });
        
    }


    

}