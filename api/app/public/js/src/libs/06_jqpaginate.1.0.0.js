/*
*
* (C) 2018 Ivan Valadares
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*
*  Document   : css
*  Author     : Ivan Valadares
*  version    : 1.0.0
*  Description: jQuery plugin to paginate json arrays
*/

(function ($, Math) {

    "use strict";

    $.fn.paginate = function (params) {

        if (params.data === undefined || params.options.render === undefined ||
            (!params.options.infinite && params.options.paginator === undefined)){
            $.error("Incorrect usage of jqpaginate! Check the required parameters.");
        }

        return new Paginator(this, params.data, params.options);
    };

    function Paginator (element, data, options) {

        this.pageNumber = 1;
        this.listView = element;
        this.listData = data;
        this.prefix = "jqpaginate";
        this.config = {};
        this.defaults = {
            "elemsPerPage": 10,
            "maxButtons": 3,
            "infinite": false,
            "showTotal": true,
            //Css classes
            "disabledClass": this.prefix + "Disabled",
            "activeClass": this.prefix + "Active",
            "containerClass": this.prefix + "Container",
            "listClass": this.prefix + "List",
            "showAllListClass": this.prefix + "ShowAllList",
            "previousClass": this.prefix + "Previous",
            "nextClass": this.prefix + "Next",
            "previousSetClass": this.prefix + "PreviousSet",
            "nextSetClass": this.prefix + "NextSet",
            "showAllClass": this.prefix + "ShowAll",
            "pageClass": this.prefix + "Page",
            "linkClass": this.prefix + "Link",
            //Text on buttons
            "previousText": "&laquo;",
            "nextText": "&raquo;",
            "previousSetText": "&hellip;",
            "nextSetText": "&hellip;",
            "showAllText": "&dArr;",
            "entryFound": "entry found",            
            "entriesFound": "entries found",            
            //callbacks
            "onItemRender": function () {
                return null;
            },
            "onPageRender": function () {
                return null;
            }
        };

        this.init = function () {
            var container = this.getContainer();
            var tableLength = this.listData.length;
            var that = this;

            $(this.listView).html("");

            if (this.config.infinite) {
                $(window).on("scroll", function () {
                    that.checkLastRowInView();
                });
            }else{
                var ulElem = this.createElement("ul", this.config.listClass).hide();

                ulElem.append(this.createPaginatorLink("previous").click(function (e) {
                    e.preventDefault();
                    that.showPreviousPage();
                }));
    
                ulElem.append(this.createPaginatorLink("previousSet").click(function (e) {
                    e.preventDefault();
                    that.showPreviousSet();
                }));
    
                ulElem.append(this.createPaginatorLink("nextSet").click(function (e) {
                    e.preventDefault();
                    that.showNextSet();
                }));
    
                ulElem.append(this.createPaginatorLink("next").click(function (e) {
                    e.preventDefault();
                    that.showNextPage();
                }));
    
                var subContainer = this.createElement("div", this.config.containerClass);
                subContainer.append(ulElem);
                if (this.config.showTotal){
                    subContainer.append("<div>" + tableLength + " " + ((tableLength != 1) ? this.config.entriesFound : this.config.entryFound) + "</div>");
                }
                container.html(subContainer);    
            }
                    
            this.renderPage();

            return this.listView;
        };

        this.createElement = function (name, attr) {
            if (typeof attr === "string") {
                attr = {"class": attr};
            }
            return $("<" + name + ">", attr || {});
        };

        this.createPaginatorLink = function (type, content) {
            return this.createElement("li", {
                "class": this.config[type + "Class"],
                "html": this.createElement("a", {
                    "class": this.config.linkClass,
                    "href": "#",
                    "html": content || this.config[type + "Text"]
                })
            });
        };

        this.getContainer = function (){
            return $(this.config.paginator);
        };

        this.getSelector = function (name) {
            if ($.isArray(name)) {
                var response = "";
                for (var index in name) {
                    response += this.getSelector(name[index]);
                }
                return response;
            }
            return "." + this.config[name + "Class"];
        };

        this.showPreviousPage = function () {
            this.pageNumber--;
            this.renderPage();
        };

        this.showNextPage = function () {
            this.pageNumber++;
            this.renderPage();
        };    

        this.showPreviousSet = function () {
            this.pageNumber = parseInt(this.getContainer().find(
                this.getSelector("page")).first().children("a").text(), 10) - 1;
            this.renderPage();
        };

        this.showNextSet = function () {
            this.pageNumber = parseInt(this.getContainer().find(
                this.getSelector("page")).last().children("a").text(), 10) + 1;
            this.renderPage();
        };

        this.checkLastRowInView = function () {

            var maxPageNumber = Math.ceil(this.listData.length / this.config.elemsPerPage);

            var docViewTop = $(window).scrollTop();
            var docViewBottom = docViewTop + $(window).height();
            var elemTop = this.listView.children().last().offset().top - 200;
        
            if (elemTop <= docViewBottom) {
                if (maxPageNumber > this.pageNumber){
                    this.pageNumber++;
                    this.renderPage();
                }
            }
        };

        this.renderSet = function () {

            var container = this.getContainer();
            var numberOfPages = Math.ceil(this.listData.length / this.config.elemsPerPage);
            var maxButtons = this.config.maxButtons - 1;
            var that = this;

            container.find(this.getSelector("previous")).addClass(this.config.disabledClass);
            container.find(this.getSelector("next")).addClass(this.config.disabledClass);

            if (this.pageNumber > 1) {
                container.find(this.getSelector("previous")).removeClass(this.config.disabledClass);
            }
            if (this.pageNumber < numberOfPages) {
                container.find(this.getSelector("next")).removeClass(this.config.disabledClass);
            }

            container.find(this.getSelector("previousSet")).hide();
            container.find(this.getSelector("nextSet")).hide();

            var firstPageToShow = Math.floor(this.pageNumber - (maxButtons / 2));

            if (firstPageToShow < 1) {
                firstPageToShow = 1;
            }
          
            var lastPageToShow = firstPageToShow + maxButtons;
          
            if (lastPageToShow > numberOfPages) {
                lastPageToShow = numberOfPages;
            }
          
            if (lastPageToShow - firstPageToShow < maxButtons){
                firstPageToShow = lastPageToShow - maxButtons;
                if (firstPageToShow < 1) {
                  firstPageToShow = 1;
                }
            }
          
            if (firstPageToShow > 1) {
                container.find(this.getSelector("previousSet")).show();
            }
          
            if (lastPageToShow < numberOfPages) {
                container.find(this.getSelector("nextSet")).show();
            }

            var pageButtonClick = function (e) {
                e.preventDefault();
                that.pageNumber = parseInt($(this).text(), 10);
                that.renderPage();
            };

            container.find(this.getSelector("page")).remove();

            var nextSetBtn = container.find(this.getSelector("nextSet"));
            for (var i = firstPageToShow; i <= lastPageToShow && i <= numberOfPages; i++) {
                var objLi = this.createPaginatorLink("page", i).click(pageButtonClick);
                if (i === this.pageNumber){
                  objLi.addClass(this.config.activeClass);
                } 
                $(nextSetBtn).before(objLi);
            }

            container.find(this.getSelector("list")).show();
        };

        this.renderPage = function () {

            if (!this.config.infinite) {
                $(this.listView).html("");
            }            
           
            var numberOfPages = Math.ceil(this.listData.length / this.config.elemsPerPage);

            if (numberOfPages === 0) {
                return;
            } else if (this.pageNumber > numberOfPages) {
                this.pageNumber = numberOfPages;
            } else if (this.pageNumber < 1) {
                this.pageNumber = 1;
            }

            var firstRow = (this.pageNumber - 1) * this.config.elemsPerPage;
            var lastRow = firstRow + this.config.elemsPerPage;

            var renderedElements = [];
            for (var index = firstRow; index < lastRow && index < this.listData.length; index++) {
                var renderedElement = $(this.config.render(this.listData[index]));
                $(this.listView).append(renderedElement);

                this.config.onItemRender.call(this.listView, renderedElement);
                renderedElements.push(renderedElement);
            }

            if (this.config.infinite) {
                this.checkLastRowInView();
            }else{
                this.renderSet();
            }

            //execute the callback
            this.config.onPageRender.call(this.listView, renderedElements);
        };

        this.config = $.extend({}, this.defaults, options || {});
        return this.init();
    }
}(jQuery, Math));