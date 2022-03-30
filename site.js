let ctri = {

    disabledTextColor: '#6c757d',
    order: 'asc',
	defaultLinkText: "Full Text",
    
    //data: [  ], Loaded in pubList.js
    
    dataCols: [
        {
            title: "display",
            data: "display",
            className: "dataTablesDisplayCol",
            render: (data, type, row, meta) => {
                return type === 'filter' ? $(data).text() : data;
            },
            visible: true
        },
        {
            title: "Article Title",
            data: "title",
            visible: false
        },
        {
            title: "Journal",
            data: "journal",
            visible: false
        },
        {
            title: "Topic",
            data: "topic",
            visible: false
        },
        {
            title: "Primary Author",
            data: "author",
            render: (data, type, row, meta) => {
                return typeof data[0] == "string" ? data[0] : data[0][2];
            },
            visible: false
        },
        {
            title: "Year",
            data: "date",
            render: (data, type, row, meta) => {
                return data.split('-')[0];
            },
            visible: false
        }
    ],

    init: () => {
        
        // Setup Talbe
        $('#mainDataTable').DataTable({
            columns: ctri.dataCols,
            data: ctri.generateData(),
            createdRow: (row,data,index) => $(row).addClass('dataTablesRow'),
            sDom: 'ftpi',
			drawCallback: () => {
				$(".dataTablesRow").append(ctri.generateExpandButton());
				$(window).resize();
			},
            language: {
                "zeroRecords": "No matching journal entries",
                "search": ""
            }
        });
        
        // Set place holder on search 
        $("input.form-control").prop('placeholder','Search journal entries');
        
        // Setup expand buttons
        $('#mainDataTable tbody').on('click', '.expandButton', (e) => {
            let $tr = $(e.currentTarget).parent();
            let table = $('#mainDataTable').DataTable();
            let row = table.row($tr);
            if (row.child.isShown()) {
                $('div.slider', row.child()).slideUp( () => {
                    row.child.hide();
                    $tr.removeClass('shown');
                });
            } else {
                row.child( ctri.generateHTMLforChild(row.data()), 'dataTableChild').show();
                $tr.addClass('shown');
                $('div.slider', row.child()).slideDown();
            }
        });
        
        // On resize we need to be sure the expand buttons don't drift
        $(window).on('resize', () => {
            $(".dataTablesRow").each( function() {
                $(this).find(".expandButton").css('transform',`translate(-40px,${$(this).height()-33}px)`)
            });
        }).resize();
        
        // Insert sort drop down
        $("#mainDataTable_filter").after(ctri.generateSortDropDown);
        $(".dataTablesCustom_sort").on('change', ctri.sort).change();
        $(".dataTablesCustom_order").on('click', ctri.orderToggle);
    },
    
    sort: (e) => {
        let selection = $(".dataTablesCustom_sort").val();
        $(".dataTablesCustom_sort").css('color', selection ? 'black' : ctri.disabledTextColor );
        let index = ctri.dataCols.map(x => x.data).indexOf( $(e.currentTarget).val() );
        let table = $('#mainDataTable').DataTable();
        table.order( [ index > -1 ? index : 0, 'asc' ] ).draw();
    },
    
    orderToggle: () => {
        ctri.order = ctri.order == "asc" ? "desc" : "asc";
        let table = $('#mainDataTable').DataTable();
        table.order( [ table.order()[0][0], ctri.order ] ).draw();
        $(".dataTablesCustom_order i").removeClass('fa-sort-amount-down fa-sort-amount-up')
        $(".dataTablesCustom_order i").addClass('fa-sort-amount-' + (ctri.order == "asc" ? 'down' : 'up'))
    },
    
    generateData: () => {
        let data = [];
        ctri.data.forEach( (el) => {
            let authors = [];
            el.author.forEach( (el) => {
                authors.push(typeof el == "string" ? el : ((el[2]||"").trim()+" "+(el[0][0]||"").trim()+(el[1][0]||"").trim()).trim());
            });
			authors = authors.filter(n=>n);
            let link = el.link ? `<a href="${el.link}">[${el.link_text||ctri.defaultLinkText}]</a>` : "";
            data.push($.extend({
                'display': `
                    <div class="container">
                      <div class="row">
                        <div class="col-9">
                          <div class="container">
                            <div class="row row-title">
                              <div class="col-12">
                                  ${el.title}
                              </div>
                            </div>
                            <div class="row">
                              <div class="col-12">
                                  ${el.journal}
                              </div>
                            </div>
                            <div class="row">
                              <div class="col-12">
                                  ${authors.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="col-3 text-end mt-1">
                            ${link}
                        </div>
                      </div>
                    </div>
                `
            }, el));
        });
        return data;
    },
Schrand J.R., Fiore M.C. (2004) Tobacco Control? Fiore Responds.American Journal of Public Health, Vol. 94, No. 9: 1475 – 1476. [Full text]

    generateHTMLforChild: (data) => {
		let authors = "";
		let date = "";
		let year = "";
		if( data.date ) {
			let [m,d,y] = data.date.split('/');
			year = y;
			let tmp = new Date(`${y}-${m}-${d}`);
			date = tmp.toLocaleString('default', { year:'numeric', month: 'long', day:"numeric" });
			date = m == "1" && d == "1" ? "" : date;
		}		
		year = year ? `(${year})` : "";
		let journal = data.journal ? `${data.journal}. ` : "";
		let volume = data.volume ? `Vol. ${data.volume}, ` : "";
		let page = data.page ? `: ${data.page}.` : ".";
		let issue = data.issue ? `No. ${issue}` : "";
		let topic = data.topic ? `${data.topic}. ` : "";
		let display = ""
		if ( journal ) {
			display = `${authors} ${year} ${data.title}.${journal}${volume}${issue}${page}`;
		} else {
			// Non Journal, online should have full date
			display = `${authors}.${data.title}.${topic}Online ${date}.`;
		}
        return display.trim().replaceAll("  "," ");
    },
    
    generateExpandButton: () => {
        return '<div class="expandButton">+</div>'
    },
    
    generateSortDropDown: () => {
        let html = "<option value=''>Sort by...</option>";
        ctri.dataCols.forEach( (el) => {
            if ( !el.visible ) {
                html = `${html}<option value="${el.data}">${el.title}</option>`;
            }
        });
        return `
            <a class="dataTablesCustom_order">
                <i class="fas fa-sort-amount-down fa-fw"></i>
            </a>
            <select class="dataTablesCustom_sort">${html}</select>`;
    }
};

$(document).ready(ctri.init);