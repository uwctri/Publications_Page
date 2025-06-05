let ctri = {

    disabledTextColor: '#6c757d',
    order: 'asc',
    data: [],
    table: null,
    dataLink: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfGyGPkZg8sJGuKa3XvAU1Cr7_tf-Wm4JIrKkNsP-tyNa0jowVhayJypx3wYy-ifxQ7CPNjNOKoUPQ/pub?gid=1937609001&single=true&output=csv',

    dataCols: [
        {
            title: "display",
            data: "display",
            className: "dataTablesDisplayCol",
            render: (data, type, row, meta) => {
                return type === 'filter' ? jQuery(data).text() : data
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
            render: (data, type, row, meta) => {
                return data.join(', ')
            },
            visible: false
        },
        {
            title: "Primary Author",
            data: "author",
            render: (data, type, row, meta) => {
                return typeof data[0] == "string" ? data[0] : data[0][2]
            },
            visible: false
        },
        {
            title: "Date of Publication",
            data: "date_of_publication",
            render: (data, type, row, meta) => {
                if (type === "sort") {
                    let mdy = data.split('/')
                    let [m, d, y] = mdy
                    return mdy.length == 3 ? `${y.padStart(4, '0')}${m.padStart(2, '0')}${d.padStart(2, '0')}` : data
                }
                return data
            },
            visible: false
        }
    ],

    loadData: async () => {
        fetch(ctri.dataLink).then(response => {
            return response.text()
        }).then(csv => {
            ctri.data = ctri.csv2json(csv)
            ctri.refresh(0)
        })
    },

    csv2json: (csvString) => {
        let json = []
        let csvArray = csvString.split("\n")

        // Remove the column names from csvArray into csvColumns.
        let csvColumns = csvArray.shift().split(',')

        csvArray.forEach((rowString) => {
            // Regex split the string to ignore commas in quotes
            let csvRow = rowString
                .replace(/(,,)/g, ',"",')
                .replace(/(^,)/g, '"",')
                .replace(/(,$)/g, ',""')
                .replace(/(,,)/g, ',"",').match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)

            // Here we work on a single row.
            // Create an object with all of the csvColumns as keys.
            let row = new Object()
            for (let colNum = 0; colNum < csvRow.length; colNum++) {
                // Remove beginning and ending quotes since stringify will add them.
                let colData = csvRow[colNum].replace(/^['"]|['"]$/g, "")
                row[csvColumns[colNum]] = colData
            }

            // Special check for our data format (more than 1 topic/author)
            let author = [row['first_name'], row['middle_name'], row['last_name']]
            if (row['title'].length) {
                row['author'] = [author]
                row['topic'] = [row['topic']]
                json.push(row)
            } else {
                if (author.join('').length) {
                    json[json.length - 1].author.push(author)
                }
                if (row['topic'].length) {
                    json[json.length - 1].topic.push(row['topic'])
                }
            }
        })

        return json
    },

    refresh: (attempt) => {
        if (attempt > 10) {
            console.log("Unable to load data, possible format issue.")
            return
        }
        try {
            ctri.table.clear()
            ctri.table.rows.add(ctri.generateTableStruct())
            ctri.table.draw()
            ctri.updateTopicDropDown()
        } catch (e) {
            console.log(e)
            setTimeout(ctri.refresh, 200, attempt + 1)
        }
    },

    init: () => {

        // Remove loading banner
        jQuery("#gtmNoLoad").remove()

        // Setup Table
        ctri.table = jQuery('#mainDataTable').DataTable({
            columns: ctri.dataCols,
            data: [],
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            createdRow: (row, data, index) => jQuery(row).addClass('dataTablesRow'),
            dom: 'lftpi',
            drawCallback: () => {
                ctri.displaySortingValue()
            },
            language: {
                "zeroRecords": "No matching journal entries",
                "emptyTable": "Loading...",
                "search": ""
            }
        })

        // Grab data from google sheets, refreshes data when done
        ctri.loadData()

        // Setup buttons, placeholders, and styles
        jQuery('#mainDataTable tbody').on('click', '.expandButton', ctri.expand)
        jQuery("input.form-control").prop('placeholder', 'Search journal entries')
        jQuery(".dataTables_length select").removeClass("form-select form-select-sm").addClass("dataTablesCustom_length")
        jQuery("#mainDataTable_filter").after(ctri.generateSortDropDown)
        jQuery(".dataTablesCustom_sort").on('change', ctri.sort).trigger("change")
        jQuery(".dataTablesCustom_order").on('click', ctri.orderToggle)
        jQuery(".dataTablesCustom_sort").after(ctri.generateTopicsDropDown())
        jQuery(".dataTablesCustom_topic").on('change', ctri.topicFilterDraw).trigger("change")
        jQuery.fn.dataTable.ext.search.push(ctri.topicFilter)

        // Grab query params, set search input
        let params = new URLSearchParams(location.search)
        ctri.table.search(params.get('search') || "").draw()
    },

    expand: (e) => {
        let $tr = jQuery(e.currentTarget).closest('tr')
        let row = ctri.table.row($tr)
        if (row.child.isShown()) {
            row.child.hide()
            $tr.find('.expandButton').removeClass("fa-circle-minus").addClass("fa-circle-plus")
            $tr.removeClass('shown')
        } else {
            row.child(ctri.generateHTMLforChild(row.data()), 'dataTableChild').show()
            $tr.find('.expandButton').removeClass("fa-circle-plus").addClass("fa-circle-minus")
            $tr.addClass('shown')
        }
    },

    sort: (e) => {
        let selection = jQuery(".dataTablesCustom_sort").val()
        jQuery(".dataTablesCustom_sort").css('color', selection ? 'black' : ctri.disabledTextColor)
        let index = ctri.dataCols.map(x => x.data).indexOf(jQuery(e.currentTarget).val())
        ctri.table.order([index > -1 ? index : 0, 'asc']).draw()
        ctri.displaySortingValue()
    },

    displaySortingValue: () => {
        let selection = jQuery(".dataTablesCustom_sort").val()
        jQuery(".sortingValue").text("")
        if (["", "title", "journal", "author"].includes(selection)) {
            return
        }
        jQuery(".sortingValue").each((_, el) => {
            let data = ctri.table.row(jQuery(el).closest('tr')).data()
            jQuery(el).text(data[selection])
        })
    },

    orderToggle: () => {
        ctri.order = ctri.order == "asc" ? "desc" : "asc"
        let table = jQuery('#mainDataTable').DataTable()
        ctri.table.order([ctri.table.order()[0][0], ctri.order]).draw()
        jQuery(".dataTablesCustom_order i").removeClass('fa-arrow-down-short-wide fa-arrow-up-short-wide')
        jQuery(".dataTablesCustom_order i").addClass(`fa-arrow-${ctri.order == "asc" ? 'down' : 'up'}-short-wide`)
    },

    generateTableStruct: () => {
        let data = []
        ctri.data.forEach((el) => {
            let authors = []
            el.author.forEach((el) => {
                authors.push(typeof el == "string" ? el : ((el[2] || "").trim() + " " + (el[0][0] || "").trim() + (el[1][0] || "").trim()).trim())
            })
            authors = authors.filter(n => n)
            let link = el.url ? `<a href="${el.url}" class="fileLink"><i class="fa-regular fa-file-lines"></i></a>` : ""
            data.push(jQuery.extend({
                'display': `
                    <div class="container m-0">
                      <div class="row">
                        <div class="col-10">
                          <div class="container">
                            <div class="row">
                              <div class="col-12 sortingValue">
                              </div>
                            </div>
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
                        <div class="col-2 rightCol">
                            ${link}
                            <i class="fa-solid fa-circle-plus expandButton"></i>
                        </div>
                      </div>
                    </div>
                `
            }, el))
        })
        return data
    },

    generateHTMLforChild: (data) => {
        let authors = []
        data.author.forEach((el) => {
            authors.push(typeof el == "string" ? el : ((el[2] || "").trim() + " " + (el[0][0] || "").trim() + (el[1][0] || "").trim()).trim())
        })
        authors = authors.filter(n => n)
        let date = ""
        let year = ""
        if (data.date_of_publication) {
            let [m, d, y] = data.date_of_publication.split('/')
            year = y
            let tmp = new Date(`${y}-${m}-${d}`)
            date = tmp.toLocaleString('default', { year: 'numeric', month: 'long', day: "numeric" })
            date = m == "1" && d == "1" ? "" : date
        }
        year = year ? `(${year})` : ""
        let journal = data.journal ? ` ${data.journal}. ` : ""
        let volume = data.volume ? `Vol. ${data.volume}, ` : ""
        let page = data.pages ? `: ${data.pages}.` : "."
        let issue = data.issue ? `No. ${data.issue}` : ""
        let primaryTopic = data.topic.length ? `${data.topic[0]}. ` : ""
        let topics = data.topic.join(', ')
        let apa = ""
        if (journal) {
            apa = `${authors.join(', ')} ${year} ${data.title}.${journal}${volume}${issue}${page}`
        } else {
            // Non Journal, online should have full date
            apa = `${authors.join(', ')}.${data.title}.${primaryTopic}Online ${date}.`
        }
        apa = apa.trim().replaceAll("  ", " ").replaceAll(". .", ".").replaceAll(", .", ".")

        return `
        <div><b>Authors:</b> ${authors.join(', ')}</div>
        <div><b>Publication Date:</b> ${data.date_of_publication}</div>
        <div><b>Paper Title:</b> ${data.title}</div>
        <div><b>Topics:</b> ${topics || "N/A"}</div>
        <div><b>Journal:</b> ${data.journal || "N/A"}</div>
        <div><b>Volume:</b> ${data.volume || "N/A"}</div>
        <div><b>Issue:</b> ${data.issue || "N/A"}</div>
        <div><b>Pages:</b> ${data.pages || "N/A"}</div>
        <div><b>APA:</b> ${apa}</div>
        `
    },

    generateSortDropDown: () => {
        let html = "<option value=''>Sort by...</option>"
        ctri.dataCols.forEach((el) => {
            if (!el.visible) {
                html = `${html}<option value="${el.data}">${el.title}</option>`
            }
        })
        return `
            <a class="dataTablesCustom_order">
                <i class="fa-solid fa-arrow-down-short-wide"></i>
            </a>
            <select class="dataTablesCustom_sort">${html}</select>`
    },

    generateTopicsDropDown: () => {
        return `
            <select class="dataTablesCustom_topic">
				<option value=''>Filter to topic...</option>
			</select>`
    },

    updateTopicDropDown: () => {
        let topics = ctri.data.map(x => x.topic).flat().filter((v, i, a) => a.indexOf(v) === i).map(x => x.trim()).sort()
        let html = topics.map(topic => `<option>${topic}</option>`).join('')
        jQuery(".dataTablesCustom_topic").append(html)
    },

    topicFilterDraw: () => {
        let selection = jQuery(".dataTablesCustom_topic").val()
        jQuery(".dataTablesCustom_topic").css('color', selection ? 'black' : ctri.disabledTextColor)
        ctri.table.draw()
    },

    topicFilter: (settings, data, dataIndex) => {
        let selection = jQuery(".dataTablesCustom_topic").val()
        return !selection || data[3].includes(selection)
    }
}
jQuery(document).ready(ctri.init)
