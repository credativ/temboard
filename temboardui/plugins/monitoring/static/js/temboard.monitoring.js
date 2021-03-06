colors = {
	blue: "#5DA5DA",
	blue2: "#226191",
	green: "#60BD68",
	red: "#F15854",
	gray: "#4D4D4D",
	light_gray: "#AAAAAA",
	orange: "#FAA43A",
}

function new_graph(id, title, api, api_url, options, start_date, end_date)
{
	var html_chart_panel = '';
	html_chart_panel += '<div class="panel panel-default">';
	html_chart_panel += '	<div class="panel-heading">';
	html_chart_panel += title;
	html_chart_panel += '		<div class="pull-right">';
	html_chart_panel += '			<button class="btn btn-primary btn-xs" id="buttonExport'+id+'">Export as PNG</button>';
	html_chart_panel += '		</div>';
	html_chart_panel += '	</div>';
	html_chart_panel += '	<div class="panel-body">';
	html_chart_panel += '		<div id="legend'+id+'" class="legend-chart"><div class="row"><div class="col-md-4 col-md-offset-4"><div class="progress"><div class="progress-bar progress-bar-striped" style="width: 100%;">Loading, please wait ...</div></div></div></div></div>';
	html_chart_panel += '		<div id="chart'+id+'" class="monitoring-chart"></div>';
	html_chart_panel += '		<div id="visibility'+id+'" class="visibility-chart"></div>';
	html_chart_panel += '	</div>';
	html_chart_panel += '</div>';
	$('#'+id).html(html_chart_panel);
	var default_options = {
			axisLabelFontSize: 10,
			yLabelWidth: 14,
			legend: "always",
			labelsDiv: "legend"+id,
			labelsKMB: true,
			drawCallback: function(g, is_initial) {
				if (is_initial)
				{
					orig_xAxisRange = g.xAxisRange();
				}
				add_visibility_cb(id, g, is_initial);
				add_export_button_callback(id, g, is_initial, title);
			},
			zoomCallback: function(minDate, maxDate, yRanges) {
				zoom(this.isZoomed(), epoch2pgtimestamp(minDate), epoch2pgtimestamp(maxDate), this, api, api_url, start_date, end_date);
				if (this.isZoomed())
					sync_dateWindow(this, this.xAxisRange());
				else
					sync_dateWindow(this, orig_xAxisRange);
				synchronize_zoom(this.isZoomed(), epoch2pgtimestamp(minDate), epoch2pgtimestamp(maxDate), this, api_url, start_date, end_date);
			}
	}

	for (var attrname in options)
	{
		default_options[attrname] = options[attrname];
	}
	var g = new Dygraph(
		document.getElementById("chart"+id),
		api_url+"/"+api+"?start="+start_date+"&end="+end_date,
		default_options
	);
	return g;
}

function epoch2pgtimestamp(epoch_ms)
{
	var ndate = new Date(epoch_ms);
	var hh = (h=ndate.getHours())<10?('0'+h):h;
	var mm = (m=ndate.getMinutes())<10?('0'+m):m;
	var ss = (s=ndate.getSeconds())<10?('0'+s):s;
	return ndate.getFullYear()+'-'+(ndate.getMonth()+1)+'-'+ndate.getDate()+'T'+hh+':'+mm+':'+ss;
}


function add_visibility_cb(chart_id, g, is_initial)
{
	if (!is_initial)
		return;

	var nb_legend_item = 0;
	var visibility_html = ''
	var cb_ids = [];
	$('#legend'+chart_id).children('span').each(function() {
		visibility_html += '<input type="checkbox" id="'+chart_id+'CB'+nb_legend_item+'" checked>';
		visibility_html += '<label for="'+chart_id+'CB'+nb_legend_item+'" style="'+$(this).attr('style')+'"> '+$(this).text()+'</label>  ';
		cb_ids.push(chart_id+'CB'+nb_legend_item);
		nb_legend_item += 1;
	});
	$('#visibility'+chart_id).html(visibility_html);
	var nb = 0;
	for(var i in cb_ids) {
		$('#'+cb_ids[i]).change(function() {
			g.setVisibility(parseInt($(this).attr('id').replace(chart_id+'CB', '')), $(this).is(':checked'));
		});
		nb += 1;
	}
}

function zoom(is_zoomed, start_date, end_date, g, data, api_url, orig_start_date, orig_end_date)
{
	if (!is_zoomed)
	{
		start_date = orig_start_date;
		end_date = orig_end_date;
	}
	g.updateOptions({
		file: api_url+"/"+data+"?start="+start_date+"&end="+end_date,
	}, false);
}

function synchronize_zoom(is_zoomed, start_date, end_date, g, api_url, orig_start_date, orig_end_date)
{
	for(var i in sync_graphs)
	{
		if (sync_graphs[i].dygraph != g)
		{
			if (!is_zoomed)
			{
				start_date = orig_start_date;
				end_date = orig_end_date;
			}
			sync_graphs[i].dygraph.updateOptions({
					file: api_url+"/"+sync_graphs[i].api+"?start="+start_date+"&end="+end_date
				}, false);
		}
	}
}
function sync_dateWindow(g, xaxisrange)
{
	for(var i in sync_graphs)
	{
		if (sync_graphs[i].dygraph != g)
		{
			sync_graphs[i].dygraph.updateOptions({
				dateWindow: xaxisrange,
				isZoomedIgnoreProgrammaticZoom: false,
			}, true);
		}
	}
}

function add_export_button_callback(chart_id, g, is_initial, label)
{
	if (!is_initial)
		return;
	$('#buttonExport'+chart_id).click(function(){
		var options = {
			titleFont: "bold 18px verdana",
			titleFontColor: "black",
			axisLabelFont: "bold 14px verdana",
			axisLabelFontColor: "black",
			labelFont: "normal 12px verdana",
			labelFontColor: "black",
			legendFont: "bold 12px verdana",
			legendFontColor: "black",
			legendHeight: 20
		};
		var img = document.getElementById('imageModal');
		Dygraph.Export.asPNG(g, img, options);
		$('#ModalLabel').html(label);
		$('#Modal').modal('show');
	});
}
