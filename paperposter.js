// JavaScript Document

CKEDITOR.replace("inputText", {height:800});
CKEDITOR.replace("outputText", {height:800});

$(document).ready(function() {
	"use strict";
	
	(function() {
	
		var paperFormatter = function(inputs) {
			var elementIndex;
			var self = this;
			this.actionIndex = 0;
			this.subActionIndex = 0;
			this.inputs = inputs;
			this.halt = false;
			var promptUserInput = function (questionHTML, displayHTML, callback) {
				$("#popupTextArea").val(displayHTML);
				$("#popupQuestion").html(questionHTML);
				$("#popupPrompt").show();
				self.halt = true;
				$("#popupOK").click(function() {
					var userInput = $("#popupInput").val();
					callback(userInput);
					$("#popupOK").off("click");
					$("#popupTextArea").html("");
					$("#popupQuestion").html("");
					$("#popupPrompt").hide();
					self.halt = false;
					self.subActionIndex++;
					self.resume();
				});
			};
			this.actions = {
				"deleteEmptyParagraphs" : function(d) {
					d = d.replace(/<(p|h[0-6])><br(\ \/)?>/g,function(match, $1) {
						return "<" + $1 + ">";
					});
					d = d.replace(/<br(\ \/)?><\/(p|h[0-6])>/g,function(match, $1, $2) {
						return "</" + $2 + ">";	
					});
					return d.replace(/<p>&nbsp;<\/p>/g,"");
				},
				"stripDivs" : function(d) {
					var tempDOM = $("<div>" + d + "</div>");
					while (tempDOM.find("div").length > 0) {
						tempDOM.find("div").eq(0).replaceWith(tempDOM.find("div").eq(0).html());
					}
					return tempDOM.html();
				},
				"guessAtHeaders" : function(d) {
					var doReplace, a, p, tempDOM = $("<div>" + d + "</div>");
					for (elementIndex = 0; elementIndex<tempDOM.find("p").length; elementIndex++) {
						p = tempDOM.find("p").eq(elementIndex);
						
						//assume it's a header at first
						doReplace = true;
						
						//check if it's a footnote by searching for links back to footnote references
						for (var secondaryElementIndex = 0; secondaryElementIndex<p.find("a").length; secondaryElementIndex++) {
							a = p.find("a").eq(secondaryElementIndex);
							
							if (typeof(a.attr("href")) !== "undefined") {
								if (a.attr("href").indexOf("_ftnref") > -1) {
									//if so, it's not a header
									doReplace = false;	
								}
							}
						}
						
						//if it's longer than 200 characters, it's probably not a header
						if (p.text().length > 200) {
							doReplace = false;
						}
						
						//if it's inside a table, it's not a header
						if (p.parents("table").length > 0) {
							doReplace = false;	
						}
							
						//if none of the previous conditions are true, it's probably a header	
						if (doReplace) {
							p.replaceWith("<h4>" + p.html() + "</h4>"); 
							elementIndex--;	
						}
						
					}
					return tempDOM.html();
				},
				"fixFootnotes" : function(d) {
					d = d.replace(/<a href=\"\#\_ftn([0-9]*)\" .*?>.*?<\/a\>/g, '<sup><a href="#_ftn$1" name="_ftnref$1">[$1]</a></sup>');
					d = d.replace(/<a href=\"\#\_ftnref([0-9]*)\" .*?>.*?<\/a\>/g, '<sup><a href="#_ftnref$1" name="_ftn$1">[$1]</a></sup>');
					return d;
				},
				"fixLists" : function(d) {
					d = d.replace(/<\/(u|o)l>(\s)*?<(u|o)l>/g, "");
					return d;
				},
				"removeImages" : function(d) {
					var tempDOM = $("<div>" + d + "</div>");
					var imgs = tempDOM.find("img"), img;
					for (elementIndex = 0;elementIndex<imgs.length;elementIndex++) {
						img = $(imgs[elementIndex]);
						
						if (img.parents("table").length > 0) {
							img.parents("table").remove();	
						} else {
							img.remove();	
						}
					}
					return tempDOM.html();
				},
				"fixTables" : function(d) {
					if (typeof(self.tablesDOM) === "undefined") {
						self.tablesDOM = $("<div>" + d + "</div>");
					}
					if (typeof(self.tables) === "undefined")  {
						self.tables = self.tablesDOM.find("table");
					}
					
					
					if (elementIndex >= self.tables.length) {
						
						console.log("finished fixing all tables");
						return self.tablesDOM.html();	
					}
					
					var table = $(self.tables[elementIndex]);
					if (table.hasClass("delete")) {	
						self.subActionIndex = 2;
					}
					switch (self.subActionIndex) {
						case 0:
						
						promptUserInput("How Many Rows Should Be Moved FROM TBODY Into THEAD? (type DELETE to remove table)", $(table)[0].outerHTML, function(response) {
							var thead, i, j, tr, tds;
							thead = table.children("thead");
							if (thead.length === 0) {
								thead = $("<thead></thead>");
								table.prepend(thead);
							}
							if (response === "DELETE") {
								table.addClass("delete");
							} else if (response > 0) {
								for (i = 0;i<Math.min($(table).find("tr").length,response);i++) {
									tr = table.find("tr").eq(i);
									tds = tr.find("td");
									for (j = 0; j<tds.length; j++) {
										var colspan = 1;
										if (tds.eq(j).attr("colspan")) {
											colspan = tds.eq(j).attr("colspan");
										}
										tds.eq(j).replaceWith("<th" + (colspan===1 ? "" : (' colspan="' + colspan + '"')) + ">" + tds.eq(j).html() + "</th>");
									}
									tr.detach();
									thead.append(tr);
								}
							}
						});
						
						break;
						case 1:
						
						promptUserInput("How Many Rows Should Be Moved From TBODY into footer area?", table[0].outerHTML, function(response) {
							var tfoot, i, tr, numtrs;
							tfoot = table.children("tfoot");
							if (tfoot.length === 0) {
								tfoot = $("<tfoot></tfoot>");
								table.append(tfoot);
							}
							numtrs = $(table).find("tr").length;
							if (response > 0) {
								for (i = numtrs - 1; i >= Math.max(0,numtrs - response);i--) {
									console.log(i);
									tr = table.find("tr").eq(i);
									tr.detach();
									tfoot.prepend(tr);
								}
							}
						});
						
						break;
						
						
						default:
						elementIndex++;
						self.subActionIndex = 0;
						return self.actions.fixTables(d);
					}
					
					return self.tablesDOM.html();	
				},
				"postTables" : function(d) {
					var tempDOM = $("<div>" + d + "</div>");
					var tables = tempDOM.find("table");
					var table, toDelete;
					
					var classMapping = {
						"left": "cellleft",
						"center": "cellcenter",
						"right": "cellright"	
					};
					
					var ps, align, tds, tfoot, cs, newFoot, j;
					
					for (var i = 0;i<tables.length;i++) {
						table = $(tables[i]);
						if (table.children().length > 0) {
							
							/*table.addClass("styledTable");*/
							table.wrap("<div class='scopedStyledTable'><div><div class='tableWrapper'></div></div></div>");
							table.parents("div.scopedStyledTable").first().prepend("<style scoped> .scopedStyledTable > div { display: inline-block; background-color:#f0f0f0; padding:10px; font-family:'Roboto Condensed', 'Courier New', 'DejaVu Sans Mono', monospace, sans-serif; } .scopedStyledTable div.tableWrapper { padding:10px; background-color:#fff; margin-bottom:10px; } .scopedStyledTable table { border-collapse:collapse; padding:10px; } .scopedStyledTable tr td, .scopedStyledTable tr th { padding:4px; height: 17px; height:1.7rem; font-size:15px; line-height:17px; font-size:1.5rem; line-height:1.7rem; } .scopedStyledTable .footerRight, .scopedStyledTable .footerLeft { font-size:13px; line-height:18px; font-size:1.3rem; line-height:1.8rem; color:#6a6a6a; font-family:\"Roboto\",\"Courier New\",\"DejaVu Sans Mono\",monospace,sans-serif; padding-bottom:5px; } @media(min-width:750px) { .scopedStyledTable .footerRight, .scopedStyledTable .footerLeft { padding-bottom:0px; } .scopedStyledTable .footerRight { float:right; text-align:right; } .scopedStyledTable .footerRight::after { clear:right; } .scopedStyledTable .footerLeft { float:left; text-align:left; } .scopedStyledTable .footerLeft::after { clear:left; } } .scopedStyledTable thead th { text-align:left; } .scopedStyledTable thead tr.figure th { font-family:Roboto; color:#575757; text-transform:uppercase; font-size:14px; line-height:12px; font-size:1.4rem; line-height:1.2rem; font-weight: 300; } .scopedStyledTable thead tr.title th { font-weight:bold; font-size:2.4rem; line-height:2.6rem; padding-bottom: 10px; } .scopedStyledTable tbody tr:first-child td { border-top:2px solid #000; } .scopedStyledTable tr.grey td, .scopedStyledTable tr.grey th { background-color:#f0f0f0; border-bottom:0px; height: 24px; vertical-align:bottom; } .scopedStyledTable .cellcenter { text-align: center; } .scopedStyledTable .cellleft { text-align: left; } .scopedStyledTable .cellright { text-align: right; } .scopedStyledTable table { border: 0px; } .scopedStyledTable table th { border-bottom:0px; } </style>");
							table.children("thead").children("tr").first().addClass("title");
							cs = table.children("thead").children("tr").first().children("th").first().attr("colspan");
							table.children("thead").prepend("<tr class='figure'><th" + (cs>1 ? " colspan=\"" + cs + "\"" : "") + ">TABLE #</th></tr>");
							table.children("thead").children("tr").last().addClass("grey");
							
							//strip p tags
							ps = table.find("p");
							for (j = 0; j<ps.length;j++) {
								align = $(ps[j]).attr("align");
								if (typeof(classMapping[align] !== "undefined")) {
									$(ps[j]).parents("td, th").first().addClass(classMapping[align]);
									$(ps[j]).contents().unwrap();
								}
							}
							
							tfoot = table.children("tfoot").find("td");
							newFoot = $("<div class='footerLeft'></div>");
							
							for (j = 0;j<tfoot.length;j++) {
								newFoot.append("<p>" + tfoot.eq(j).html() + "</p>");
							}
							table.parents("div.tableWrapper").first().after(newFoot);
							table.children("tfoot").remove();
						
						} else {
							table.addClass("delete");
						}
						
						
					}
					//remove all attributes
					tds = tempDOM.find("*");
					for (j = 0; j<tds.length;j++) {
						$(tds[j]).removeAttr("nowrap");
						$(tds[j]).removeAttr("style");
						$(tds[j]).removeAttr("width");
						$(tds[j]).removeAttr("valign");
						$(tds[j]).removeAttr("align");
						$(tds[j]).removeAttr("border");
						$(tds[j]).removeAttr("cellspacing");
						$(tds[j]).removeAttr("cellpadding");
					}
					
					toDelete = tempDOM.find("table.delete");
					console.log(toDelete);
					for (j = 0;j<toDelete.length;j++) {
						toDelete.eq(j).parents("div.scopedStyledTable").first().remove();
					}
					
					
					return tempDOM.html();
				}
			};
			this.performOperations = function(startAt) {
				
				for (self.actionIndex = startAt; self.actionIndex<inputs.length;self.actionIndex++) {
					if ($(inputs[self.actionIndex]).attr("checked") === "checked") {
						self.currentHTML = self.actions[$(inputs[self.actionIndex]).attr("id")](self.currentHTML);
						if (self.halt === true) {
							return;	
						}
					}
					console.log("finished action " + self.actionIndex);
					self.subActionIndex = 0;
					elementIndex = 0;
				}
				CKEDITOR.instances.outputText.setData(self.currentHTML);
			};
			this.resume = function() {
				this.performOperations(this.actionIndex);
			};
		};
	
	
	
		$("#performOperations").click(function() {
			var inputs = $(this).parents("div.middleColumn").find('input[type="checkbox"]:checked');
			var pF = new paperFormatter(inputs);
			pF.currentHTML = CKEDITOR.instances.inputText.getData();
			pF.performOperations(0);
			
		});

	}());
});