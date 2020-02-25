var d3_locale_frCA = d3.locale(
  {  "decimal": ",",
     "thousands": ".",
     "grouping": [3],
     "currency": ["", "$"],
     "dateTime": "%a %e %b %Y %X",
     "date": "%Y-%m-%d",
     "time": "%H:%M:%S",
     "periods": ["", ""],
     "days": ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
     "shortDays": ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
     "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
     "shortMonths": ["jan", "fév", "mar", "avr", "mai", "jui", "jul", "aoû", "sep", "oct", "nov", "déc"]
  }
);
var d3_locale_enUS = d3.locale(
  {  "decimal": ".",
     "thousands": ",",
     "grouping": [3],
     "currency": ["$", ""],
     "dateTime": "%a %b %e %X %Y",
     "date": "%m/%d/%Y",
     "time": "%H:%M:%S",
     "periods": ["AM", "PM"],
     "days": ["Sunday","Monday","Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
     "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
     "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
     "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  }
);


function getD3Locale(chartConfig) {
    if(chartConfig.hasOwnProperty("locale") && chartConfig.locale != null) {
        var theLocale = chartConfig.locale.trim();
        if(theLocale == "" || theLocale == "en") {
            return d3_locale_enUS;
        } else if(theLocale == "fr") {
            return d3_locale_frCA;
        } else {
            return eval("d3_locale_"+theLocale.replace("-",""));
        }
    } else {
        return d3_locale_enUS;
    }
}

function getLocalizedChartLabel(chartConfig, text) {
    var localizedLabels = null;
    if(chartConfig.hasOwnProperty("locale") && chartConfig.locale != null) {
        var theLocale = chartConfig.locale.trim();
        if(theLocale == "" || theLocale == "en") {
            localizedLabels = getLocalizedChartLabels("en");
        } else if(theLocale == "fr") {
            localizedLabels = getLocalizedChartLabels("fr");
        }
    } else {
        localizedLabels = getLocalizedChartLabels("en");
    }
    if(!localizedLabels) {
        return text;
    } else {
        if(localizedLabels.hasOwnProperty(text)) {
            return localizedLabels[text];
        } else {
            return text;
        }
    }
}

function getContextPath() {
    var pathArray = window.location.pathname.split( '/' );
    return "/" + pathArray[1] + "/";
}

function getCharts(callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", './assets/dashboard/escharts.json', true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState == 4) {
            if(rawFile.status == 200) {
                console.log("getCharts Data:" + JSON.stringify(JSON.parse(rawFile.responseText)));
                callback(JSON.parse(rawFile.responseText));
            } else {
                console.log("getCharts Error:" + rawFile.status + "-" + rawFile.responseText);
            }
        }
    }
    rawFile.send(null);
}

function getChart(chartId,callback) {
    getCharts(function(theCharts) {
        for(var k=0; k < theCharts.length; k++) {
            if(theCharts[k].id == chartId) {
                callback(theCharts[k]);
            }
        }
    });
}

function getLocalTimeZone() {
    var timezone_offset_min = new Date().getTimezoneOffset();
    var offset_hrs = parseInt(Math.abs(timezone_offset_min/60));
    var offset_min = Math.abs(timezone_offset_min%60);
    var timezone_standard = null;

    if(offset_hrs < 10) {
        offset_hrs = '0' + offset_hrs;
    }
    if(offset_min < 10) {
        offset_min = '0' + offset_min;
    }

    if(timezone_offset_min < 0) {
        timezone_standard = '+' + offset_hrs + ':' + offset_min;
    } else if(timezone_offset_min > 0) {
        timezone_standard = '-' + offset_hrs + ':' + offset_min;
    } else {
        timezone_standard = '+00:00';
    }
    
    return timezone_standard; 
}


//////////////////////////////Below is the actual charts implementation codes////////////////////////////////////////////
function NVD3Charts($scope) {
  this.$scope = $scope;
}

var saveChartToCSV = function(theChart) {
  var convertArrayOfObjectsToCSV = function(args) {  
        var result, keys, columnDelimiter, lineDelimiter, i;

        data = args.data || null;
        if (data == null || !data.length) {
            return null;
        }

        columnDelimiter = args.columnDelimiter || ',';
        lineDelimiter = args.lineDelimiter || '\n';

        keys = Object.keys(data[0]);
        
        result = '';
        
        for(i = 0; i < keys.length; i++) {
            if(!keys[i].endsWith("_actual")) {
                result = result + "\"" + keys[i] + "\"" + columnDelimiter;
            }
        };
        result = result.substring(0,result.length-1);
        result = result + lineDelimiter;

        for(i = 0; i < data.length; i++) {
            var item = data[i];
            var row = '';
            for(var k = 0; k < keys.length; k++) {
                if(!keys[k].endsWith("_actual")) {
                    if(typeof item[keys[k]] === "string") {
                        row = row + "\"" + item[keys[k]] + "\"" + columnDelimiter;
                    } else {
                        row = row + item[keys[k]] + columnDelimiter;
                    }
                }
            }
            row = row.substring(0,row.length-1);
            result = result + row + lineDelimiter;
        };
        result = result.substring(0,result.length-1);
        
        return result;
    }
    
    while(theChart.childChart && theChart.childChart.hasOwnProperty("chartData")) {
        theChart = theChart.childChart;
    }
    var csv = convertArrayOfObjectsToCSV({data:this.getNormalizedChartData(theChart)});
    if(!csv) {
        csv = ",";
    }
    var BB = new Blob([csv],{type: "text/csv;charset=utf-8"})
    saveAs(BB,theChart.name + "_" + Date.now() + ".csv");
    
}

var getNormalizedChartData = function(theChart) {
    var formatData = function(formatFuncStr, data) {
      var formattedData = data;
      if(formatFuncStr && formatFuncStr.trim() != '') {
          try {
              formattedData = eval("var chartConfig = theChart; " + formatFuncStr)(data);
          } catch (e) {
              formattedData = data;
          }
      }
      return formattedData;
    }
    var normalizeChartData = function(theChart) {
        var dataForCSV = [];
        var obj = {};
        if(theChart.chartType == "stackbar") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter,cvalue.x);
                    obj[yLabel] = formatData(theChart.ui.yFormatter,cvalue.y);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.x;
                    obj[yLabel+"_actual"] = cvalue.y;
                    dataForCSV.push(obj);
                }
            }
        } else if (theChart.chartType == "bar") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter,cvalue.label);
                    obj[yLabel] = formatData(theChart.ui.yFormatter,cvalue.value);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.label;
                    obj[yLabel+"_actual"] = cvalue.value;
                    dataForCSV.push(obj);
                }
            }
            if(theChart.chartData.length == 1) {
                //remove empty key field for single bar chart
                for(var j=0; j < dataForCSV.length; j++) {
                    delete dataForCSV[j][keyLabel];
                    delete dataForCSV[j][keyLabel+"_actual"];
                }
            }
        } else if(theChart.chartType == "bubble") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            var sizeLabel = getLocalizedChartLabel(theChart,"Size");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter, cvalue.x);
                    obj[yLabel] = formatData(theChart.ui.yFormatter, cvalue.y);
                    obj[sizeLabel] = cvalue.size;
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.x;
                    obj[yLabel+"_actual"] = cvalue.y;
                    obj[sizeLabel+"_actual"] = cvalue.size;
                    dataForCSV.push(obj);
                }
            }
        } else if(theChart.chartType == "donut") {
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            var valueLabel = getLocalizedChartLabel(theChart,"Value");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                obj = {};
                obj[keyLabel] = cdata.key;
                obj[valueLabel] = formatData(theChart.ui.valueFormatter, cdata.value);
                obj[keyLabel+"_actual"] = cdata.key;
                obj[valueLabel+"_actual"] = cdata.value;
                dataForCSV.push(obj);
            }
        } else if(theChart.chartType == "gauge") {
            var titleLabel = getLocalizedChartLabel(theChart,theChart.ui.title);
            obj = {};
            obj[titleLabel] = formatData(theChart.ui.valueFormatter, theChart.chartData[0]);
            obj[titleLabel+"_actual"] = theChart.chartData[0];
            dataForCSV.push(obj);
        } else if(theChart.chartType == "horizontal_multi_bar") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter, cvalue.label);
                    obj[yLabel] = formatData(theChart.ui.valueFormatter, cvalue.value);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.label;
                    obj[yLabel+"_actual"] = cvalue.value;
                    dataForCSV.push(obj);
                }
            }
        } else if (theChart.chartType == "line") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter, cvalue.x);
                    obj[yLabel] = formatData(theChart.ui.yFormatter, cvalue.y);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.x;
                    obj[yLabel+"_actual"] = cvalue.y;
                    dataForCSV.push(obj);
                }
            }
            if(theChart.chartData.length == 1) {
                //remove empty key field for single line chart
                for(var j=0; j < dataForCSV.length; j++) {
                    delete dataForCSV[j][keyLabel];
                    delete dataForCSV[j][keyLabel+"_actual"];
                }
            }
        } else if (theChart.chartType == "multi_chart") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var y1Label = getLocalizedChartLabel(theChart,!theChart.ui.y1Label ? "y1Label" : theChart.ui.y1Label);
            var y2Label = getLocalizedChartLabel(theChart,!theChart.ui.y2Label ? "y2Label" : theChart.ui.y2Label);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter, cvalue.x);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue.x;
                    if(cdata.yAxis == 1) {
                      obj[y1Label] = formatData(theChart.ui.y1Formatter, cvalue.y);
                      obj[y2Label] = "";
                      obj[y1Label+"_actual"] = cvalue.y;
                      obj[y2Label+"_actual"] = "";
                    } else {
                        obj[y1Label] = "";
                        obj[y2Label] = formatData(theChart.ui.y2Formatter, cvalue.y);
                        obj[y1Label+"_actual"] = "";
                        obj[y2Label+"_actual"] = cvalue.y;
                    }
                    dataForCSV.push(obj);
                }
            }
        } else if(theChart.chartType == "pie") {
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            var valueLabel = getLocalizedChartLabel(theChart,"Value");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                obj = {};
                obj[keyLabel] = cdata.label;
                obj[valueLabel] = formatData(theChart.ui.valueFormatter, cdata.value);
                obj[keyLabel+"_actual"] = cdata.label;
                obj[valueLabel+"_actual"] = cdata.value;
                dataForCSV.push(obj);
            }
        } else if(theChart.chartType == "stackarea") {
            var xLabel = getLocalizedChartLabel(theChart,theChart.ui.xLabel);
            var yLabel = getLocalizedChartLabel(theChart,theChart.ui.yLabel);
            var keyLabel = getLocalizedChartLabel(theChart,"Key");
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                for(var k=0; k < cdata.values.length; k++) {
                    var cvalue = cdata.values[k];
                    obj = {};
                    obj[keyLabel] = cdata.key;
                    obj[xLabel] = formatData(theChart.ui.xFormatter, cvalue[0]);
                    obj[yLabel] = formatData(theChart.ui.yFormatter, cvalue[1]);
                    obj[keyLabel+"_actual"] = cdata.key;
                    obj[xLabel+"_actual"] = cvalue[0];
                    obj[yLabel+"_actual"] = cvalue[1];
                    dataForCSV.push(obj);
                }
            }
        } else if (theChart.chartType == "table") {
            for(var i=0; i < theChart.chartData.length; i++) {
                var cdata = theChart.chartData[i];
                var docCount = cdata["Count"];
                obj = {};
                if(theChart.ui.bucket1Label) {
                    obj[getLocalizedChartLabel(theChart,theChart.ui.bucket1Label)] = formatData(theChart.ui.bucket1Formatter,cdata["bucket1"]);
                    obj[getLocalizedChartLabel(theChart,theChart.ui.bucket1Label)+"_actual"] = cdata["bucket1"];
                }
                if(theChart.ui.bucket2Label) {
                    obj[getLocalizedChartLabel(theChart,theChart.ui.bucket2Label)] = formatData(theChart.ui.bucket2Formatter,cdata["bucket2"]);
                    obj[getLocalizedChartLabel(theChart,theChart.ui.bucket2Label)+"_actual"] = cdata["bucket2"];
                }
                if(theChart.ui.metric1Label) {
                    if(cdata.hasOwnProperty("metric1")) {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric1Label)] = formatData(theChart.ui.metric1Formatter,cdata["metric1"]);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric1Label)+"_actual"] = cdata["metric1"];
                    } else {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric1Label)] = formatData(theChart.ui.metric1Formatter,docCount);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric1Label)+"_actual"] = docCount;
                    }
                }
                if(theChart.ui.metric2Label) {
                    if(cdata.hasOwnProperty("metric2")) {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric2Label)] = formatData(theChart.ui.metric2Formatter,cdata["metric2"]);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric2Label)+"_actual"] = cdata["metric2"];
                    } else {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric2Label)] = formatData(theChart.ui.metric2Formatter,docCount);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric2Label)+"_actual"] = docCount;
                    }
                }
                if(theChart.ui.metric3Label) {
                    if(cdata.hasOwnProperty("metric3")) {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric3Label)] = formatData(theChart.ui.metric3Formatter,cdata["metric3"]);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric3Label)+"_actual"] = cdata["metric3"];
                    } else {
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric3Label)] = formatData(theChart.ui.metric3Formatter,docCount);
                        obj[getLocalizedChartLabel(theChart,theChart.ui.metric3Label)+"_actual"] = docCount;
                    }
                }
                dataForCSV.push(obj);
            }
        }
        return dataForCSV;   
    }
    
    while(theChart.childChart && theChart.childChart.hasOwnProperty("chartData")) {
        theChart = theChart.childChart;
    }
    return normalizeChartData(theChart);
}

var drawChart = function(chartConfig) {
    var $scope = (typeof this.$scope === 'undefined') ? null : this.$scope;
		
    //////////////////////Clear Chart Area//////////////////////////////////////////////////
    var clearChartArea = function(chartConfig) {
        var chartContainerTag = chartConfig.chartPath.substring(0, chartConfig.chartPath.indexOf(" ")); //#chart
        var chartAreaTag = chartConfig.chartPath.substring(chartConfig.chartPath.indexOf(" ") + 1); //either svg or div
        if(d3.select(chartContainerTag).selectAll("*").empty() == false) {
            d3.select(chartContainerTag).selectAll("*").remove();
        }
        d3.select(chartContainerTag).append(chartAreaTag);
    }
    
    //////////////////////Chart drill up////////////////////////////////////////////////////
    var drillUp = function(chartConfig) {
        delete chartConfig.chartData;
        copyObject(JSON.parse(chartConfig.parent),chartConfig);
        eval(chartConfig.drawFunc);
    }
    
    var copyObject = function(object1, object2) {
        for(var i in object2) {
            if(object2.hasOwnProperty(i) ) {
                delete object2[i];
            }
        }
        for(var p in object1) {
            if(object1.hasOwnProperty(p) ) {
                object2[p] = object1[p];
            }
        }
    }
    
    //////////////////////Notify about the currently displayed chart////////////////////////
    var setCurrentlyDisplayedChart = function(chartConfig) {
        if($scope != null && $scope.hasOwnProperty("setCurrentlyDisplayedChart")) {
        	$scope.setCurrentlyDisplayedChart(chartConfig);
        }
    }
    
    //////////////////////Evaluate script function//////////////////////////////////////////
    var evaluateScript = function(str) {
        if(str) {
            return eval(str);
        } else {
            return null;
        }
    }
    
    //////////////////////Check Empty Object function///////////////////////////////////////
    function isEmpty(obj) {
        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }

    //////////////////////Display chart tile or error message///////////////////////////////
    var showChartTitle = function (chartConfig, chartText) {
      try {
        if(chartText == "chartError") {
            var container = d3.select(chartConfig.chartPath);
            var margin = {"left":0,"top":0,"right":0,"bottom":0}
            var noDataText = container.selectAll('.nv-noData').data([getLocalizedChartLabel(chartConfig,chartText)]);
            var height = nv.utils.availableHeight(null, container, margin);
            var width = nv.utils.availableWidth(null, container, margin);
            noDataText.enter()
                .append('text')
                .attr('class', 'nvd3 nv-noData')
                .attr('dy', '-.7em')
                .style('text-anchor', 'middle')
                .attr('x', width/2)
                .attr('y', height/2)
                .text(function(t){ return t; });
            setCurrentlyDisplayedChart(chartConfig);
        } else if(chartConfig.ui.titlePosition.hasOwnProperty("x") && chartConfig.ui.titlePosition.hasOwnProperty("y")) {
            d3.select(chartConfig.chartPath).append("text")
            .attr("x", chartConfig.ui.titlePosition.x)
            .attr("y", chartConfig.ui.titlePosition.y)
            .attr("alignment-baseline","alphabetic")
            .attr("text-anchor", "start")
            .style("font-family", "Arial")
            .style("font-size", "16px") 
            .style("text-decoration", "none")  
            .text(getLocalizedChartLabel(chartConfig,chartText));
        }
        if(chartConfig.parent) {
            createDrillUpLink(chartConfig,d3.select(chartConfig.chartPath));
        }
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        return;
      }
    }
    
    var createDrillUpLink = function (chartConfig, drawArea) {
        var drillUpId = "drillup" + (chartConfig.chartPath+chartConfig.name).replace(/[^A-Z0-9]/ig,"_");
        drawArea.append("a")
        .attr("xlink:href", "#")
        .attr("id",drillUpId)
        .append("text")
        .text("^")
        .style({"font-size":"20px", "color":"Black"})
        .attr("x", 0)             
        .attr("y", 20);
        var drillUpLink = document.getElementById(drillUpId)
        drillUpLink.onclick = function(){drillUp(chartConfig); return false;}
    }
    
  //////////////////////Draw stack bar chart//////////////////////////////////////////////
  var drawStackBarChart = function(chartConfig) {
    try{
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showControls = chartConfig.ui.showControls;
        var controlLabels = {"grouped":getLocalizedChartLabel(chartConfig,"grouped"),"stacked":getLocalizedChartLabel(chartConfig,"stacked")};
        var showLegend = chartConfig.ui.showLegend;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var tooltipHeaderFormatter = evaluateScript(chartConfig.ui.tooltipHeaderFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var duration = chartConfig.ui.duration;
        var reduceXTicks = chartConfig.ui.reduceXTicks;
        var staggerLabels = chartConfig.ui.staggerLabels;
        var groupSpacing = chartConfig.ui.groupSpacing;
        var useInteractiveGuideline = chartConfig.ui.useInteractiveGuideline;
        var legendPosition = chartConfig.ui.legendPosition;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;

        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
        
    }catch(e){
      console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
      showChartTitle(chartConfig,"chartError");
      return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
    
    nv.addGraph(function() {
      try {
        chart = nv.models.multiBarChart()
            .duration(duration)
            .height(height)
            .width(width)
            .margin(margin)
            .color(color)
            .showControls(showControls)
            .showLegend(showLegend)
            .showXAxis(showXAxis)
            .showYAxis(showYAxis)
            .controlLabels(controlLabels)
            .reduceXTicks(reduceXTicks)
            .staggerLabels(staggerLabels)
            .groupSpacing(groupSpacing)
            .legendPosition(legendPosition)
            .useInteractiveGuideline(useInteractiveGuideline)
            .noData(noData);
        
        chart.multibar.dispatch.on("elementDblClick", function(evt) {
            console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartDoubleClicked") + ":",JSON.stringify(evt));
            chart.tooltip.hidden(true);
            if(useInteractiveGuideline == true) {
                chart.interactiveLayer.tooltip.hidden(true);
            }
            if(chartConfig.ui.dblClickEventHandler) {
                eval(chartConfig.ui.dblClickEventHandler);
            }
        });
        
        chart.xAxis
            .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
            .axisLabelDistance(xLabelDistance)
            .rotateLabels(xRotateLabels)
            .showMaxMin(xShowMaxMin);
            
        
        if(xFormatter) {
            chart.xAxis.tickFormat(xFormatter);
        }

        chart.yAxis
            .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
            .rotateLabels(yRotateLabels)
            .axisLabelDistance(yLabelDistance)
            .showMaxMin(yShowMaxMin);
            
        if(yFormatter) {
            chart.yAxis.tickFormat(yFormatter);
        }
        
        if(tooltipValueFormatter) {
            chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipHeaderFormatter) {
            chart.tooltip.headerFormatter(tooltipHeaderFormatter)
        }
        
        showChartTitle(chartConfig, chartConfig.name);
        
        chartConfig.chartData = chartData;
        
        setCurrentlyDisplayedChart(chartConfig);
       
        d3.select(chartPath)
            .datum(JSON.parse(JSON.stringify(chartData)))
            .call(chart);

        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw table chart//////////////////////////////////////////////
  var drawTableChart = function(chartConfig) {
      var chartPath = chartConfig.chartPath;
      var formatData = function(formatFuncStr, data) {
          var formattedData = data;
          if(formatFuncStr && formatFuncStr.trim() != '') {
              try {
                  formattedData = eval(formatFuncStr)(data);
              } catch (e) {
                  formattedData = data;
              }
          }
          return formattedData;
      }
      var showTableMessage = function(table, message) {
          if(table != null) {
              var thead =  table.select("thead");
              if(thead.empty()) {
                  thead = table.append('thead').style(chartConfig.ui.theadStyle);
              }
              thead.append('tr').style(chartConfig.ui.trStyle)
                .selectAll("th")
                .data([getLocalizedChartLabel(chartConfig,message)])
                .enter().append("th")
                .text(function(d) { return d; })
                .attr("colspan",1)
                .style(chartConfig.ui.thStyle);
          }
      }
      var table = null;
      try {
          var sortAscending = true;
          var containerDiv = d3.select(chartConfig.chartPath).attr('class', 'row').style(chartConfig.ui.containerStyle); 
          var leftDiv = containerDiv.append('div').attr('class', 'col-md-1');
          if(chartConfig.parent) {
              createDrillUpLink(chartConfig, leftDiv);
          }
          var middleDiv = containerDiv.append('div').attr('class', 'col-md-10');
          var rightDiv = containerDiv.append('div').attr('class', 'col-md-1');
          var jsonToArray = function(json) {
              var ret = new Array();
              var docCount = json["Count"];
              if(chartConfig.ui.bucket1Label) {
                  ret.push(["bucket1", formatData(chartConfig.ui.bucket1Formatter,json["bucket1"])]);
              }
              if(chartConfig.ui.bucket2Label) {
                  ret.push(["bucket2", formatData(chartConfig.ui.bucket2Formatter,json["bucket2"])]);
              }
              if(chartConfig.ui.metric1Label) {
                  if(json.hasOwnProperty("metric1")) {
                      ret.push(["metric1", formatData(chartConfig.ui.metric1Formatter,json["metric1"])]);
                  } else {
                      ret.push(["metric1", formatData(chartConfig.ui.metric1Formatter,docCount)]);
                  }
              }
              if(chartConfig.ui.metric2Label) {
                  if(json.hasOwnProperty("metric2")) {
                      ret.push(["metric2", formatData(chartConfig.ui.metric2Formatter,json["metric2"])]);
                  } else {
                      ret.push(["metric2", formatData(chartConfig.ui.metric2Formatter,docCount)]);
                  }
              }
              if(chartConfig.ui.metric3Label) {
                  if(json.hasOwnProperty("metric3")) {
                      ret.push(["metric3", formatData(chartConfig.ui.metric3Formatter,json["metric3"])]);
                  } else {
                      ret.push(["metric3", formatData(chartConfig.ui.metric3Formatter,docCount)]);
                  }
              }
              return ret;
          };
          var stringCompare = function(a, b, asc) {
              if(asc) {
                  return a > b ? 1 : a == b ? 0 : -1;
              } else {
                  return a < b ? 1 : a == b ? 0 : -1;
              }
          }
          var getColumnLabel = function(chartConfig,column) {
              if("bucket1" == column) {
                  return getLocalizedChartLabel(chartConfig, chartConfig.ui.bucket1Label);
              } else if("bucket2" == column) {
                  return getLocalizedChartLabel(chartConfig, chartConfig.ui.bucket2Label);
              } else if("metric1" == column) {
                  return getLocalizedChartLabel(chartConfig, chartConfig.ui.metric1Label);
              } else if("metric2" == column) {
                  return getLocalizedChartLabel(chartConfig, chartConfig.ui.metric2Label);
              } else if("metric3" == column) {
                  return getLocalizedChartLabel(chartConfig, chartConfig.ui.metric3Label);
              } else if("Count" == column) {
                  return getLocalizedChartLabel(chartConfig, "Count");
              } else {
                  return "";
              }
          }
          var chartData = evaluateScript(chartConfig.dataFunc);
          var thead = null;
          chartConfig.chartData = chartData;
          table = middleDiv.append('table').attr("id","tablechart_" + chartConfig.id).attr('class', 'table table-responsive').style(chartConfig.ui.tableStyle);
          thead = table.append('thead').style(chartConfig.ui.theadStyle);
          if(chartConfig.ui.showTitleInTable) {
              thead.append('tr').style(chartConfig.ui.trStyle)
                 .selectAll("th")
                .data([chartConfig.name])
                .enter().append("th")
                .text(function(d) { return d; })
                .attr("colspan",(chartData.length == 0) ? 1 : jsonToArray(chartData[0]).length)
                .style(chartConfig.ui.thStyle);
          }
          if(chartData.length == 0) {
              showTableMessage(table,"noData");
              return;
          }
          thead.append('tr').style(chartConfig.ui.trStyle)
              .selectAll("th")
              .data(jsonToArray(chartData[0]))
              .enter().append("th")
              .text(function(d) {
                  return getColumnLabel(chartConfig,d[0]); 
              })
              .style(chartConfig.ui.thStyle)
              .on('click', function (d) {
                  thead.selectAll("th").attr("class",'');
                  if(chartConfig.ui.sortable) {
                      if(sortAscending) {
                          sortAscending = false;
                          this.className = 'des';
                      } else {
                          sortAscending = true;
                          this.className = 'aes';
                      }
                      setTableBody(table, d[0]);
                  }
              });
          
          var setTableBody = function(table, sortColumn) {
              if(table.select("tbody") != null) {
                 table.select("tbody").remove();
              }
              var tbody = table.append('tbody').style(chartConfig.ui.tbodyStyle);
              // Rows
              var tr = tbody.selectAll("tr")
                .data(chartData)
                .enter().append("tr")
                .style(chartConfig.ui.trStyle);
              if(chartConfig.ui.sortable && sortColumn != null) {
                  tr.sort(function (a, b) {
                      if(a.hasOwnProperty(sortColumn)) {
                          return a == null || b == null ? 0 : stringCompare(a[sortColumn], b[sortColumn], sortAscending);
                      } else {
                          return a == null || b == null ? 0 : stringCompare(a["Count"], b["Count"], sortAscending);
                      }
                  })
              }
              
              // Cells
              var td = tr.selectAll("td")
                .data(function(d) { return jsonToArray(d); })
                .enter().append("td")
                .on('click', function (d) {
                    if(chartConfig.ui.dblClickEventHandler) {
                        var evtData = {"data":d};
                        eval('var evt=' + JSON.stringify(evtData) + ";" + chartConfig.ui.dblClickEventHandler);
                    }
                })
                .text(function(d) { return d[1]; })
                .style(chartConfig.ui.tdStyle);
          }
          setTableBody(table, null);
      }catch(e){
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
          showTableMessage(table,"chartError");
      }
  }
  
  //////////////////////Draw line chart//////////////////////////////////////////////
  var drawLineChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showLegend = chartConfig.ui.showLegend;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var tooltipHeaderFormatter = evaluateScript(chartConfig.ui.tooltipHeaderFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var duration = chartConfig.ui.duration;
        var useInteractiveGuideline = chartConfig.ui.useInteractiveGuideline;
        var xTicksThreshold = chartConfig.ui.xTicksThreshold;
        var legendPosition = chartConfig.ui.legendPosition;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;

        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
  
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }

    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try{
        chart = nv.models.lineChart()
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .showXAxis(showXAxis)
        .showYAxis(showYAxis)
        .duration(duration)
        .useInteractiveGuideline(useInteractiveGuideline)
        .legendPosition(legendPosition)
        .noData(noData);

        chart.lines.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(useInteractiveGuideline == true) {
              chart.interactiveLayer.tooltip.hidden(true);
          }
          if(chartConfig.ui.clickEventHandler) {
              eval(chartConfig.ui.clickEventHandler);
          }
        });
      
        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .axisLabelDistance(xLabelDistance)
        .rotateLabels(xRotateLabels)
        .showMaxMin(xShowMaxMin);
  
        if(xFormatter) {
            chart.xAxis.tickFormat(xFormatter);
        }
      
        if(xTicksThreshold > 0 && chartData.length > 0 && chartData[0]["xtickLabels"].length < xTicksThreshold) {
            chart.xAxis.ticks(chartData[0]["xtickLabels"].length);
        }
 
        chart.yAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
        .rotateLabels(yRotateLabels)
        .axisLabelDistance(yLabelDistance)
        .showMaxMin(yShowMaxMin);
  
        if(yFormatter) {
            chart.yAxis.tickFormat(yFormatter);
        }
  
        if(tooltipValueFormatter) {
            chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipHeaderFormatter) {
            chart.tooltip.headerFormatter(tooltipHeaderFormatter)
        }

        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);
      
        d3.select(chartPath)
            .datum(JSON.parse(JSON.stringify(chartData)))
            .call(chart);

        return chart;
      }catch(e) {
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw gauge chart//////////////////////////////////////////////
  var drawGaugeChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var title = chartConfig.ui.title;
        var min = 0;
        var max = 0;
        var zoneLimit1 = chartConfig.ui.zoneLimit1;
        var zoneLimit2 = chartConfig.ui.zoneLimit2;
        var showMinMaxLabels = chartConfig.ui.showMinMaxLabels;
        var valueFormatter = evaluateScript(chartConfig.ui.valueFormatter);
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = 0;
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
            min = evaluateScript(chartConfig.ui.min);
            max = evaluateScript(chartConfig.ui.max);
        }
        
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }

    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.gaugeChart()
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .title(getLocalizedChartLabel(chartConfig,title))
        .min(min)
        .max(max)
        .zoneLimit1(zoneLimit1)
        .zoneLimit2(zoneLimit2)
        .showMinMaxLabels(showMinMaxLabels)
        .noData(noData);
      
        if(valueFormatter) {
          chart.valueFormat(valueFormatter);
        }
      
        chart.gauge.dispatch.on("chartClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          if(chartConfig.ui.chartClickEventHandler) {
              eval(chartConfig.ui.chartClickEventHandler);
          }
        });

        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);
      
        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);

        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw bar chart//////////////////////////////////////////////
  var drawBarChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var barColor = chartConfig.ui.barColor;
        var showValues = chartConfig.ui.showValues;
        var showLegend = chartConfig.ui.showLegend;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var xTicksThreshold = chartConfig.ui.xTicksThreshold;
        var duration = chartConfig.ui.duration;
        var staggerLabels = chartConfig.ui.staggerLabels;
        var wrapLabels = chartConfig.ui.wrapLabels;
        var valueFormatter = evaluateScript(chartConfig.ui.valueFormatter);
        var tooltipKeyFormatter = evaluateScript(chartConfig.ui.tooltipKeyFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
  
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.discreteBarChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value })
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .showXAxis(showXAxis)
        .showYAxis(showYAxis)
        .color([barColor])
        .showValues(showValues)
        .duration(duration)
        .staggerLabels(staggerLabels)
        .wrapLabels(wrapLabels)
        .noData(noData);
          
        if(valueFormatter) {
          chart.valueFormat(valueFormatter);
        }

        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .axisLabelDistance(xLabelDistance)
        .rotateLabels(xRotateLabels)
        .showMaxMin(xShowMaxMin);
  
        if(xFormatter) {
          chart.xAxis.tickFormat(xFormatter);
        }
      
        if(xTicksThreshold > 0 && chartData.length > 0 && chartData[0].values.length > xTicksThreshold) {
          var bars = chartData[0].values;
          var tickValues = [];
          tickValues.push(bars[0].label);
          tickValues.push(bars[bars.length-1].label);
          for(var p=1; p < bars.length-1; p++) {
              if(p % 10 == 0) {
                  tickValues.push(bars[p].label);
              }
          }
          chart.xAxis.tickValues(tickValues);
        }
 
        chart.yAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
        .axisLabelDistance(yLabelDistance)
        .rotateLabels(yRotateLabels)
        .showMaxMin(yShowMaxMin);
  
        if(yFormatter) {
          chart.yAxis.tickFormat(yFormatter);
        }
   
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipKeyFormatter) {
          chart.tooltip.keyFormatter(tooltipKeyFormatter)
        }
      
        chart.discretebar.dispatch.on("elementDblClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartDoubleClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.dblClickEventHandler) {
              eval(chartConfig.ui.dblClickEventHandler);
          }
        });
      
        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);

        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);

        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw multiple types chart//////////////////////////////////////////////
  var drawMultiChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var yAxes = [];
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color =  evaluateScript(chartConfig.ui.color);
        var showLegend = chartConfig.ui.showLegend;
        var xLabel = chartConfig.ui.xLabel;
        var y1Label = chartConfig.ui.y1Label;
        var y2Label = chartConfig.ui.y2Label;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var y1RotateLabels = chartConfig.ui.y1RotateLabels;
        var y2RotateLabels = chartConfig.ui.y2RotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var y1Formatter = evaluateScript(chartConfig.ui.y1Formatter);
        var y2Formatter = evaluateScript(chartConfig.ui.y2Formatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var y1LabelDistance = chartConfig.ui.y1LabelDistance;
        var y2LabelDistance = chartConfig.ui.y2LabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var y1ShowMaxMin = chartConfig.ui.y1ShowMaxMin;
        var y2ShowMaxMin = chartConfig.ui.y2ShowMaxMin;
        var duration = chartConfig.ui.duration;
        var streamType1 = chartConfig.ui.streamType1;
        var streamType2 = chartConfig.ui.streamType2;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        var getYAxisKey = function(yAxisKeyIdx) {
          for(var p=0; p < yAxes.length; p++) {
            if(yAxes[p].idx == yAxisKeyIdx) {
              return yAxes[p].key;
            }
          }
          return null;
        }

        if(isEmpty(chartConfig.esData)) {
            yAxes = [];
            chartData = [];
        } else {
            var convertedData = evaluateScript(chartConfig.dataFunc);
            yAxes = convertedData.yAxes;
            chartData = convertedData.chartData;
        }

    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }

    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));

    nv.addGraph(function() {
      try {
        chart = nv.models.multiChart()
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .duration(duration)
        .noData(noData);
    
        chart.legendRightAxisHint(" (" + getLocalizedChartLabel(chartConfig,"right axis") + ")");

        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .rotateLabels(xRotateLabels)
        .axisLabelDistance(xLabelDistance)
        .showMaxMin(xShowMaxMin);

        if(xFormatter) {
          chart.xAxis.tickFormat(xFormatter);
        }

        chart.yAxis1
        .rotateLabels(y1RotateLabels)
        .axisLabelDistance(y1LabelDistance)
        .showMaxMin(y1ShowMaxMin);
    
        if(!y1Label) {
          chart.yAxis1
          .axisLabel(getLocalizedChartLabel(chartConfig,getYAxisKey(1)));
        } else {
          chart.yAxis1
          .axisLabel(getLocalizedChartLabel(chartConfig,y1Label));
        }

        if(y1Formatter) {
          chart.yAxis1.tickFormat(y1Formatter);
        }
   
        chart.yAxis2
        .rotateLabels(y2RotateLabels)
        .axisLabelDistance(y2LabelDistance)
        .showMaxMin(y2ShowMaxMin);
    
        if(!y2Label) {
          chart.yAxis2
          .axisLabel(getLocalizedChartLabel(chartConfig,getYAxisKey(2)));
        } else {
          chart.yAxis2
          .axisLabel(getLocalizedChartLabel(chartConfig,y2Label));
        }

        if(y2Formatter) {
          chart.yAxis2.tickFormat(y2Formatter);
        }
    
        chart.lines1.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.lines2.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.scatters1.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.scatters2.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.bars1.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.bars2.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.stack1.dispatch.on("areaClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });
        chart.stack2.dispatch.on("areaClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
            eval(chartConfig.ui.clickEventHandler);
          }
        });

        showChartTitle(chartConfig, chartConfig.name);
    
        chartConfig.chartData = chartData;
    
        setCurrentlyDisplayedChart(chartConfig);
    
        d3.select(chartPath)
        .datum(JSON.parse(JSON.stringify(chartData)))
        .call(chart);

        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw pie chart//////////////////////////////////////////////
  var drawPieChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showLegend = chartConfig.ui.showLegend;
        var showLabels = chartConfig.ui.showLabels;
        var showTooltipPercent = chartConfig.ui.showTooltipPercent;
        var valueFormatter = evaluateScript(chartConfig.ui.valueFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var duration = chartConfig.ui.duration;
        var labelsOutside = chartConfig.ui.labelsOutside;
        var labelSunbeamLayout = chartConfig.ui.labelSunbeamLayout;
        var legendPosition = chartConfig.ui.legendPosition;
        var labelThreshold = chartConfig.ui.labelThreshold;
        var labelType = chartConfig.ui.labelType;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;

        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
        
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.pieChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value })
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .showLabels(showLabels)
        .valueFormat(valueFormatter)
        .showTooltipPercent(showTooltipPercent)
        .duration(duration)
        .legendPosition(legendPosition)
        .labelThreshold(labelThreshold)
        .labelType(labelType)
        .noData(noData);
          
        chart.pie.labelsOutside(labelsOutside);
        chart.pie.labelSunbeamLayout(labelSunbeamLayout);
      
        chart.pie.dispatch.on("elementDblClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartDoubleClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.dblClickEventHandler) {
              eval(chartConfig.ui.dblClickEventHandler);
          }
        });
      
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
      
        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);

        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .transition().duration(duration)
          .call(chart);
    
        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw horizontal multiple bars chart/////////////////////////////////////////////
  var drawHorizontalMultiBarChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showControls = chartConfig.ui.showControls;
        var controlLabels = {"grouped":getLocalizedChartLabel(chartConfig,'grouped'),"stacked":getLocalizedChartLabel(chartConfig,'stacked')};
        var showLegend = chartConfig.ui.showLegend;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var showValues = chartConfig.ui.showValues;
        var showControls = chartConfig.ui.showControls;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var tooltipHeaderFormatter = evaluateScript(chartConfig.ui.tooltipHeaderFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var duration = chartConfig.ui.duration;
        var groupSpacing = chartConfig.ui.groupSpacing;
        var valueFormatter = evaluateScript(chartConfig.ui.valueFormatter);
        var legendPosition = chartConfig.ui.legendPosition;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
  
    }catch(e){
       console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
       showChartTitle(chartConfig, "chartError");
       return;
    }

    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.multiBarHorizontalChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value })
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showControls(showControls)
        .controlLabels(controlLabels)
        .showLegend(showLegend)
        .showXAxis(showXAxis)
        .showYAxis(showYAxis)
        .showValues(showValues)
        .groupSpacing(groupSpacing)
        .duration(duration)
        .legendPosition(legendPosition)
        .noData(noData);
      
        if(valueFormatter) {
          chart.valueFormat(valueFormatter);
        }
      
        chart.multibar.dispatch.on("elementDblClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartDoubleClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.dblClickEventHandler) {
              eval(chartConfig.ui.dblClickEventHandler);
          }
        });
      
        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .axisLabelDistance(xLabelDistance)
        .rotateLabels(xRotateLabels)
        .showMaxMin(xShowMaxMin);
      
        if(xFormatter) {
          chart.xAxis.tickFormat(xFormatter);
        }

        chart.yAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
        .rotateLabels(yRotateLabels)
        .axisLabelDistance(yLabelDistance)
        .showMaxMin(yShowMaxMin);
      
        if(yFormatter) {
          chart.yAxis.tickFormat(yFormatter);
        }
  
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipHeaderFormatter) {
          chart.tooltip.headerFormatter(tooltipHeaderFormatter)
        }

        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);
      
        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);

        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
      
    });
  }
  
  //////////////////////Draw stack area chart//////////////////////////////////////////////
  var drawStackAreaChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showControls = chartConfig.ui.showControls;
        var controlLabels = {"stream":getLocalizedChartLabel(chartConfig,'stream'),"stacked":getLocalizedChartLabel(chartConfig,'stacked'),"expanded":getLocalizedChartLabel(chartConfig,'expanded')};
        var showLegend = chartConfig.ui.showLegend;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var tooltipHeaderFormatter = evaluateScript(chartConfig.ui.tooltipHeaderFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var duration = chartConfig.ui.duration;
        var showTotalInTooltip = chartConfig.ui.showTotalInTooltip;
        var totalLabel = chartConfig.ui.totalLabel;
        var useInteractiveGuideline = chartConfig.ui.useInteractiveGuideline;
        var legendPosition = chartConfig.ui.legendPosition;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
        
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.stackedAreaChart()
        .x(function(d) { return d[0] })
        .y(function(d) { return d[1] })
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showControls(showControls)
        .showLegend(showLegend)
        .showXAxis(showXAxis)
        .showYAxis(showYAxis)
        .controlLabels(controlLabels)
        .showTotalInTooltip(showTotalInTooltip)
        .totalLabel(getLocalizedChartLabel(chartConfig,totalLabel))
        .duration(duration)
        .useInteractiveGuideline(useInteractiveGuideline)
        .legendPosition(legendPosition)
        .noData(noData);
      
        chart.stacked.dispatch.on("areaClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          if(useInteractiveGuideline) {
              chart.interactiveLayer.tooltip.hidden(true);
          }
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
              eval(chartConfig.ui.clickEventHandler);
          }
        });

        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .rotateLabels(xRotateLabels)
        .axisLabelDistance(xLabelDistance)
        .showMaxMin(xShowMaxMin);
      
        if(xFormatter) {
          chart.xAxis.tickFormat(xFormatter);
        }
     
        chart.yAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
        .rotateLabels(yRotateLabels)
        .axisLabelDistance(yLabelDistance)
        .showMaxMin(yShowMaxMin);
      
        if(yFormatter) {
          chart.yAxis.tickFormat(yFormatter);
        }
      
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipHeaderFormatter) {
          chart.tooltip.headerFormatter(tooltipHeaderFormatter)
        }

        chart.legend.vers('furious');
      
        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);

        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);
      
        return chart;
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
    });
  }
  
  //////////////////////Draw bubble chart//////////////////////////////////////////////
  var drawBubbleChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showLegend = chartConfig.ui.showLegend;
        var showLabels = chartConfig.ui.showLabels;
        var showXAxis = chartConfig.ui.showXAxis;
        var showYAxis = chartConfig.ui.showYAxis;
        var xLabel = chartConfig.ui.xLabel;
        var yLabel = chartConfig.ui.yLabel;
        var xRotateLabels = chartConfig.ui.xRotateLabels;
        var yRotateLabels = chartConfig.ui.yRotateLabels;
        var xFormatter = evaluateScript(chartConfig.ui.xFormatter);
        var yFormatter = evaluateScript(chartConfig.ui.yFormatter);
        var tooltipHeaderFormatter = evaluateScript(chartConfig.ui.tooltipHeaderFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var showDistX = chartConfig.ui.showDistX;
        var showDistY = chartConfig.ui.showDistY;
        var clipEdge = false;
        var xLabelDistance = chartConfig.ui.xLabelDistance;
        var yLabelDistance = chartConfig.ui.yLabelDistance;
        var xShowMaxMin = chartConfig.ui.xShowMaxMin;
        var yShowMaxMin = chartConfig.ui.yShowMaxMin;
        var duration = chartConfig.ui.duration;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
  
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.scatterChart()
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .showXAxis(showXAxis)
        .showYAxis(showYAxis)
        .showLabels(showLabels)
        .clipEdge(clipEdge)
        .showDistX(showDistX)
        .showDistY(showDistY)
        .duration(duration)
        .noData(noData);
      
        chart.xAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,xLabel))
        .rotateLabels(xRotateLabels)
        .axisLabelDistance(xLabelDistance)
        .showMaxMin(xShowMaxMin);
  
        if(xFormatter) {
          chart.xAxis.tickFormat(xFormatter);
        }
 
        chart.yAxis
        .axisLabel(getLocalizedChartLabel(chartConfig,yLabel))
        .rotateLabels(yRotateLabels)
        .axisLabelDistance(yLabelDistance)
        .showMaxMin(yShowMaxMin);
  
        if(yFormatter) {
          chart.yAxis.tickFormat(yFormatter);
        }
  
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
        if(tooltipHeaderFormatter) {
          chart.tooltip.headerFormatter(tooltipHeaderFormatter)
        }
      
        chart.scatter.dispatch.on("elementClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.clickEventHandler) {
              eval(chartConfig.ui.clickEventHandler);
          }
        });

        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);
      
        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);

        return chart;
      
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
      
    });
  }
  
  //////////////////////Draw donut chart//////////////////////////////////////////////
  var drawDonutChart = function(chartConfig) {
    try {
        var chartPath = chartConfig.chartPath;
        var chartData = null;
        var height = chartConfig.ui.height;
        var width = chartConfig.ui.width;
        var margin = chartConfig.ui.margin;
        var color = evaluateScript(chartConfig.ui.color);
        var showLabels = chartConfig.ui.showLabels;
        var showLegend = chartConfig.ui.showLegend;
        var labelThreshold = chartConfig.ui.labelThreshold;
        var labelType = chartConfig.ui.labelType;
        var valueFormatter = evaluateScript(chartConfig.ui.valueFormatter);
        var tooltipValueFormatter = evaluateScript(chartConfig.ui.tooltipValueFormatter);
        var showTooltipPercent = chartConfig.ui.showTooltipPercent;
        var donutRatio = chartConfig.ui.donutRatio;
        var duration = chartConfig.ui.duration;
        var labelsOutside = chartConfig.ui.labelsOutside;
        var labelSunbeamLayout = chartConfig.ui.labelSunbeamLayout;
        var legendPosition = chartConfig.ui.legendPosition;
        var noData = getLocalizedChartLabel(chartConfig,"noData");
        var chart;
  
        if(isEmpty(chartConfig.esData)) {
            chartData = [];
        } else {
            chartData = evaluateScript(chartConfig.dataFunc);
        }
  
    }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
        return;
    }
  
    console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartData") + ":",JSON.stringify(chartData));
  
    nv.addGraph(function() {
      try {
        chart = nv.models.pieChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value })
        .height(height)
        .width(width)
        .margin(margin)
        .color(color)
        .showLegend(showLegend)
        .showLabels(showLabels)
        .labelThreshold(labelThreshold)
        .labelType(labelType)
        .donut(true)
        .valueFormat(valueFormatter)
        .donutRatio(donutRatio)
        .showTooltipPercent(showTooltipPercent)
        .showTooltipPercent(showTooltipPercent)
        .duration(duration)
        .legendPosition(legendPosition)
        .noData(noData);
      
        chart.pie.labelsOutside(labelsOutside);
        chart.pie.labelSunbeamLayout(labelSunbeamLayout);
      
        chart.pie.dispatch.on("elementDblClick", function(evt) {
          console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartDoubleClicked") + ":",JSON.stringify(evt));
          chart.tooltip.hidden(true);
          if(chartConfig.ui.dblClickEventHandler) {
              eval(chartConfig.ui.dblClickEventHandler);
          }
        });
      
        if(tooltipValueFormatter) {
          chart.tooltip.valueFormatter(tooltipValueFormatter);
        }
      
        showChartTitle(chartConfig, chartConfig.name);
      
        chartConfig.chartData = chartData;
      
        setCurrentlyDisplayedChart(chartConfig);

        d3.select(chartPath)
          .datum(JSON.parse(JSON.stringify(chartData)))
          .call(chart);
    
        return chart;
      
      }catch(e){
        console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",e);
        showChartTitle(chartConfig, "chartError");
      }
      
    });
  }
  
  //////////////////////Main chart drawing logic//////////////////////////////////////////////
  var http = new XMLHttpRequest();
  var url = chartConfig.serverConnection + chartConfig.esIndex;
  var esQuery = JSON.stringify(chartConfig.esQuery);
  esQuery = esQuery.replace("[[begin_time]]",chartConfig["fromDate"]);
  esQuery = esQuery.replace("[[end_time]]",chartConfig["toDate"]);
  var tQuery = chartConfig.query;
  if(tQuery.length > 0) {
      tQuery = JSON.stringify(tQuery);
      tQuery = tQuery.substring(1,tQuery.length-1);
  }
  esQuery = esQuery.replace("[[query]]", tQuery);
  if(!chartConfig.timeZone || !chartConfig.timeZone.trim()) {
      esQuery = esQuery.replace("[[time_zone]]", getLocalTimeZone);
  } else {
      esQuery = esQuery.replace("[[time_zone]]", chartConfig.timeZone.trim());
  }
  chartConfig.esQueryFinalized = JSON.parse(esQuery);
  console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"esQuery") + ":", esQuery);
  clearChartArea(chartConfig);
  http.open("POST", url, true);
  http.setRequestHeader("Content-type", "application/json");
  http.onreadystatechange = function() {
      if(http.readyState == 4) {
          if (http.status == 200) {
              chartConfig.esData = JSON.parse(http.responseText);
              console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"esData") + ":",JSON.stringify(chartConfig.esData));
              switch(chartConfig.chartType) {
                  case "bar":
                      drawBarChart(chartConfig);
                      break;
                  case "bubble":
                      drawBubbleChart(chartConfig);
                      break;
                  case "donut":
                      drawDonutChart(chartConfig);
                      break;
                  case "gauge":
                      drawGaugeChart(chartConfig);
                      break;
                  case "horizontal_multi_bar":
                      drawHorizontalMultiBarChart(chartConfig);
                      break;
                  case "line":
                      drawLineChart(chartConfig);
                      break;
                  case "multi_chart":
                      drawMultiChart(chartConfig);
                      break;
                  case "pie":
                      drawPieChart(chartConfig);
                      break;
                  case "stackarea":
                      drawStackAreaChart(chartConfig);
                      break;
                  case "stackbar":
                      drawStackBarChart(chartConfig);
                      break;
                  case "table":
                      drawTableChart(chartConfig);
                      break;
                  default:
                      console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError"), chartConfig);
                      showChartTitle(chartConfig,"chartError");
              }
          } else {
              console.log("'" + chartConfig.name + "' " + getLocalizedChartLabel(chartConfig,"chartError") + ":",http.status," ",http.responseText);
              showChartTitle(chartConfig,"chartError");
          }
      }
  }
  http.send(esQuery);
}


