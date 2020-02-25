var charts_all_labels = {};

loadLabelsForLanguage("en");
loadLabelsForLanguage("fr");

function loadLabelsForLanguage(language) {
    var pathArray = window.location.pathname.split( '/' );
    var contextRoot = "/" + pathArray[1] + "/";
    var labelFile = new XMLHttpRequest();
    labelFile.overrideMimeType("application/json");
    labelFile.open("GET", './assets/i18n/' +language+".json", true);
    labelFile.onreadystatechange = function() {
        if (labelFile.readyState == 4) {
            if(labelFile.status == 200) {
                console.log("get label file for language " + language);
                var allLabels = JSON.parse(labelFile.responseText);
                charts_all_labels[language] = allLabels["chartLabels"];
            } else {
                console.log("get label file for language " + language + " Error:" + labelFile.status + "-" + labelFile.responseText);
            }
        }
    }
    labelFile.send(null);
}


function getLocalizedChartLabels(language) {
    if(charts_all_labels.hasOwnProperty(language)) {
        return charts_all_labels[language];
    } else {
        return {};
    }
    
}