var kiosk = (function() {
  var mode = "view";
  var in_dialog = 0;
  var page = "";
  var links;
  var idle_for = 0;
  var can_edit = false;

  function edit_mode() {
    stop_idle_timer();
    mode = "edit";
    $("#editor_mode").show();
    $(".image_button").resizable().draggable().css(
      {
        "border": "2px solid white",
        "background": "rgba( 255, 255, 191, 0.5)"
      }).show().off("click");
    $(".image_button > .link").css({"display": "inline"});
    $(".dblclick_edit").editable(function(value, settings) { 
        return(value);
      },
      { 
        indicator : "<img src='img/indicator.gif'>",
        tooltip   : "Doubleclick to edit...",
        event     : "dblclick",
        style  : "inherit"
      });
  };

  function view_mode() {
    start_idle_timer();
    mode = "view";
    $("#editor_mode").hide();
    $(".image_button").resizable('destroy').draggable('destroy').css(
      {
        "border": "none",
        "background": "none",
        "color": "none"
      });
    $(".image_button > .link").css({"display": "none"});
    $(".image_button").off("click").on("click", function (e) {
      do_click($(this).children(".link").text());
    });
  };

  function do_click(link) {
    console.log("do_click", link);
    if (link[0] == '/') {
      console.log("page");
      window.location = "/" + link.slice(1);
    } else {
      console.log("popup", '/_popup/'+link.slice(1));
      $.fancybox.open({
        href: '/_popup/' + link.slice(1),
        title: '',
        type: 'ajax',
        maxWidth: 800,
        openSpeed: 10,
        closeSpeed: 10,
        closeClick: true,
        wrapCSS: "box-wrapper"
      });
    }
  }

  function link_div(link, css) {
    css = css || { "left": 10, "top": 10, "width": 371, "height": 67 };
    $("#imagemap").append(jQuery("<div/>",
      {
        class: "image_button",
        css: css
      }).append(jQuery('<span/>', {
        class: "link",
        text: link
      })));
  }

  function handle_keypress(event) {
    if(in_dialog) { 
      if (event.which == 13) { event.preventDefault(); }
      //console.log("kb event, in dialog");
      return;
    }
    console.log("keypress", event.which);
    if(event.which == 101 && allow_edit) { // e
      console.log("toggle edit");
      if(mode == "edit") {
        view_mode();
      } else {
        edit_mode();
      }
    } else if(event.which == 107) { // k
      console.log("kiosk toggle");
      if($("body").css("overflow") == 'hidden') {
        $("body").css("overflow", "visible");
      } else {
        $("body").css("overflow", "hidden");
      }
    } else if(mode == "edit" && event.which == 98) { // b
      event.preventDefault();
      $("#updatePageBackground").modal("show")
    } else if(mode == "edit" && event.which == 108) { // l
      event.preventDefault();
      $("#addLink").modal("show");
    } else if(mode == "edit" && event.which == 110) { // n
      event.preventDefault();
      $("#addNewPage").modal("show");    
    } else if(mode == "edit" && event.which == 112) { // p
      event.preventDefault();
      $("#addNewPopup").modal("show")
    } else if(mode == "edit" && event.which == 115) { // s
      console.log("save");
      save_locations();
    } else {
      console.log("unknown keypress");
    }
  };

  function save_locations() {
    var l = [];
    $(".image_button").each(function (i, e) {
      var pos = $(e).position()
      l.push({
        'link': $(e).text(),
        'left': pos.left,
        'top': pos.top,
        'width': $(e).width(),
        'height': $(e).height()
      });
    });
    console.log("alert mssages soon!");
    $.post('/_loc/'+page, {'links': JSON.stringify(l)});
    console.log("alert mssages now!");
    $("#messages").html('<div class="alert alert-success">Links saved</div>');
    window.setTimeout(function() { $("#messages .alert").alert('close').removeClass("alert-success"); }, 2000);
  }

  function load_locations() {
    $.getJSON('/_loc/'+page, function(data) {
      $.each(data, function(k, v) {
        var link = v.link;
        delete v['link']
        link_div(link, v);
      });
      if (mode == "view") {
        view_mode();
      } else {
        edit_mode();
      }
    });
  }

  function load_links() {
    $.getJSON('/_links/', function(data) {
      links = data;
      $.each(links, function(k, v) {
        $("#links").append('<option value="' + v[0] + '">' + v[0] + '</option>');
      });
    });
  };

  function do_add_new_page() {
    console.log('new page');
    var data = new FormData($("#addNewPage form")[0]);

    $.ajax({
      url: '_kiosk_item/',
      type: 'POST',
      data: data,
      processData: false,
      contentType: false,
      success: function(response) {
        var data = $.parseJSON(response);
        console.log("data:", data);
        if (data.status == "OK") {
          console.log("page ok");
          $("#addNewPage").modal("hide");
          $("#addNewPage form")[0].reset();
          $("#messages").html('<div class="alert alert-success">Page added.</div>');
          window.setTimeout(function() { $("#messages .alert").alert('close').removeClass("alert-success"); }, 2000);
          link_div(data.link);
          edit_mode();
          load_links();
        } else {
          console.log("popup err: ", data.errors);
        }
      }
    });
  }

  function do_add_new_popup() {
    console.log("add new popup");
    var fields = ["name", "title", "url", "text", "type", "csrfmiddlewaretoken"];
    var data = new FormData($("#addNewPopup form")[0]);
    var i, k, v;

    $.ajax({
      url: '_kiosk_item/' + page,
      type: 'POST',
      data: data,
      processData: false,
      contentType: false,
      success: function(response) {
        var data = $.parseJSON(response);
        console.log("data:", data);
        if (data.status == "OK") {
          console.log("popup ok");
          $("#addNewPopup").modal("hide");
          $("#addNewPopup form")[0].reset();
          $("#messages").html('<div class="alert alert-success">Popup added.</div>');
          window.setTimeout(function() { $("#messages .alert").alert('close').removeClass("alert-success"); }, 2000);
          link_div(data.link);
          edit_mode();
          load_links();
        } else {
          console.log("popup err: ", data.errors);
        }
      }
    });
  }

  function do_add_link() {
    var link = $("#links").val();
    console.log("add link: ", link);
    link_div(link);
    edit_mode();
    $("#addLink").modal('hide');
  }

  function do_update_page_background() {
    var file = $("#updatePageBackground :file")[0].files[0];
    var csrf_token = $('input[name="csrfmiddlewaretoken"]').val();
    var formdata = new FormData();
    formdata.append('file_upload', file);
    formdata.append('csrfmiddlewaretoken', csrf_token);
    $.ajax({
        url: '_update_page_background/' + page,
        type: 'POST',
        data: formdata,
        processData: false,
        contentType: false,
        success: function (response) {
          var data = $.parseJSON(response);
          if (data.status === "OK") {
            var d = new Date();
            var url = "media/kiosk_page/index?ts=" + d.getTime();
            console.log("updating to", url);
            $("#imagemap").css("background-image", "url(" + url + ")");
            $('#updatePageBackground').modal('hide');
            $("#updatePageBackgroundForm")[0].reset();
          } else {
            console.log("BOOM");
            $("#updatePageBackgroundAlerts")
              .html(data.status)
              .addClass("alert alert-error");
          }
        }
    });
  }

  function create_dialogs() {
    $("#addNewPage .btn-primary").on("click",
      function(event){ do_add_new_page(event); });

    $("#updatePageBackground .btn-primary").on("click",
      function(event){ do_update_page_background(event); });
    $("#updatePageBackground").on("show", 
      function(event) { $("#updatePageBackgroundAlerts").html("").removeClass("alert alert-error"); });

    $("#resetPopup .btn-primary").on("click",
      function(event) { $("#resetPopup").modal("hide"); });

    $("#addNewPopup .btn-primary").on("click", 
      function(event) { do_add_new_popup(event); });

    $("#addLink .btn-primary").on("click", 
      function(event) { do_add_link(event); });

    $(".modal").on("show", function(event) { in_dialog = true; });
    $(".modal").on("hide", function(event) { in_dialog = false; });
  };

  function update_tips( t ) {
    $(".validate_tips")
    .text( t )
    .addClass( "ui-state-highlight" );
    setTimeout(function() {
      $(".validate_tips").removeClass( "ui-state-highlight", 1500 );
    }, 500 );
  };
  
  function idle() {
    console.log("idle timeout")
    idle_for = 0;
    $.timer('idle_timer', countdown, 1, {timeout: 11, finishCallback: reset}).start();
    $("#resetPopup").modal("show");
  };

  function countdown() {
    $("#countdown").html(10 - idle_for);
    idle_for++;
  }

  function reset() {
    console.log("reset")
    if(page == "index") {
      $("#resetPopup").modal("hide");
    } else {
      window.location = "/";
    }
  };

  function active() {
    console.log("activate")
    idle_for = 0;
    $.timer('idle_timer', null);
    $("#reset-message").dialog("close");
  };

  function start_idle_timer() {
    idle_for = 0;
    // only run the idle timeout code on the actual kiosk
    $.idleTimer(30000);
    $(document).bind("idle.idleTimer", idle);
    $(document).bind("active.idleTimer", active);
  }

  function stop_idle_timer() {
    $.idleTimer('destroy');
  }

  return {
    init : function(pagename, can_edit)
    {
      page = pagename;
      allow_edit = can_edit;

      $(document).keypress(handle_keypress);
      create_dialogs();
      load_locations();
      view_mode();
      load_links();
              

      if($(window).height() < 1070 || $(window).width() < 1910) {
        // show scrollbars for browsers that don't have a large window
        // this should allow things to work on a laptop and still avoid
        // scrollbars when running on the kiosk
        $("body").css("overflow", "visible");
      } else {
        start_idle_timer();
      }
    }
  }
})();


(function(kiosk, Backbone, $, _) {
  kiosk.Controller = {
    init: function(can_edit) {
      self = this;
      console.log("can_edit", can_edit);
      this.can_edit = can_edit;
      this.dispatcher = _.clone(Backbone.Events);
      console.log("models");
      this.models = {
        "pageModel": new kiosk.KioskPage(),
        "linkCollection": new kiosk.KioskLinkCollection(),
        "popupCollection": new kiosk.KioskPopupCollection()
      }

      this.models.popupCollection.fetch({
        'success': function(popups) {
          console.log("loaded PopupCollection: ", popups, popups.get("infinera"));
        }
      });

      console.log("view");
      this.views = {
        "pageView": new kiosk.KioskPageView({model: this.models.pageModel, "controller": this}),
        "linksView": new kiosk.KioskLinkCollectionView({collection: this.models.linkCollection, "controller": this}),
        "editView": new kiosk.KioskEditView({"controller": this})
      };

      console.log("router");
      this.router = new kiosk.Router({"controller": this});

      this.models.pageModel.bind('sync', this.views.pageView.render, this.views.pageView);
      this.models.linkCollection.bind('sync', this.views.linksView.render, this.views.linksView);

      console.log("links at init:", this.models.linkCollection.length);

      self.in_dialog = false;
      self.mode = "view";

      $(document).keypress(kiosk.Controller.handle_keypress);

      Backbone.history.start();
    },

    handle_keypress: function (event) {
      console.log("keypress_this", self);
      if(self.in_dialog) { 
        //if (event.which == 13) { event.preventDefault(); }
        //console.log("kb event, in dialog");
        return;
      }
      console.log("keypress", event.which);
      if(event.which == 101 && self.can_edit) { // e
        if(self.mode == "edit") {
          //view_mode();
          self.mode = "view";
        } else {
          //edit_mode();
          self.mode = "edit";
        }
        console.log(self.mode + " mode")
        self.views.editView.render();
      } else if(event.which == 107) { // k
        console.log("kiosk toggle");
        if($("body").css("overflow") == 'hidden') {
          $("body").css("overflow", "visible");
        } else {
          $("body").css("overflow", "hidden");
        }
      } else if(self.mode == "edit" && event.which == 108) { // l
        event.preventDefault();
        self.dispatcher.trigger("new-link-key");
      } else if(self.mode == "edit" && event.which == 110) { // n
        event.preventDefault();
        self.dispatcher.trigger("new-page-key");
      } else if(self.mode == "edit" && event.which == 112) { // p
        event.preventDefault();
        self.dispatcher.trigger("new-popup-key");
      } else if(self.mode == "edit" && event.which == 115) { // s
        console.log("save");
        save_locations();
      } else if(self.mode == "edit" && event.which == 116) { // t
        event.preventDefault();
        self.dispatcher.trigger("edit-this-page-key");
      } else {
        console.log("unknown keypress");
      }
    }
  }

  kiosk.Router = Backbone.Router.extend({
    routes: {
      '': "showIndex",
      ":page":  "showPage"
    },

    initialize: function(options) {
      this.controller = options.controller;

      _.bindAll(this, 'showIndex', 'showPage');
    },

    showIndex: function() {
      console.log("came in through index, redirect to #index")
      this.navigate("index", {trigger: true});
    },

    showPage: function(page) {
      console.log("show page " + page)
      this.controller.models.pageModel.set("id", page, {"silent": true});
      this.controller.models.pageModel.fetch();

      this.controller.models.linkCollection.page = page;
      this.controller.models.linkCollection.loaded = false;
      this.controller.models.linkCollection.fetch({
        success: function(links) { links.loaded = true; }
      });
      console.log("show page done");
    }
  }),

  kiosk.KioskPage = Backbone.Model.extend({
    "urlRoot": "/_kiosk_page"
  }),

  kiosk.KioskLink = Backbone.Model.extend({
    render: function() {
      return this;
    }
  }),

  kiosk.KioskPopup = Backbone.Model.extend({
    "urlRoot": "/_kiosk_popup"
  }),

  kiosk.KioskPopupCollection = Backbone.Collection.extend({
    "model": kiosk.KioskPopup,
    "url": "/_kiosk_popup"
  }),

  kiosk.KioskLinkCollection = Backbone.Collection.extend({
    model: kiosk.KioskLink,
    url: function() {
      var url = window.location.origin + "/_loc/" + this.page;
      return url;
    }
  }),

  // KioskLinkCollectionView manages the divs with class .image_button within the #imagemap div

  kiosk.KioskLinkCollectionView = Backbone.View.extend({
    el: "#imagemap",

    events: {
      "click .image_button": "doClick",
      "click .image_button .link": "editClick"
    },

    render: function() {
      var self = this;
      console.log("render KioskLinkCollectionView", this);
      this.$(".image_button").remove();
      _.each(this.collection.models, function(x) { 
        var css = { top: x.get("top"), left: x.get("left"), width: x.get("width"), height: x.get("height") };
        self.$el.append(
          $("<div/>", { "class": "image_button", css: css }).append($("<div/>", { "class": "link", "text": x.get("link") }))
        );
     });
    },

    doClick: function(e) {
      console.log("click", e, e.currentTarget);
      if (this.options.controller.mode === "view") {
        var target = $(e.target).text();
        console.log("target", target);
        if (target[0] === "/") {
          this.options.controller.router.navigate(target.slice(1), {"trigger": true});
        } else {
          var popup_details = this.options.controller.models.popupCollection.get(target.slice(1));
          var template = _.template($('#popupTemplate').html(), {popup: popup_details});
          var popup = $("#popup");
          popup.html(template);
          popup.modal();
          popup.modal("show");
        }
      }
    },

    editClick: function(e) {
      console.log("edit click", e);
    }
  }),

  // KioskPageView manages setting the page image and other housekeeping
  kiosk.KioskPageView = Backbone.View.extend({
    el: "#imagemap",

    render: function () {
      console.log("render KioskPageView", this, this.model.loaded);
      if (this.model.get("name")) {
        var url = this.model.get('page_image');
        console.log("updating to", url);
        this.$el.css("background-image", "url(" + url + ")");
      } else {
        console.log("do nothing or show loader?")
      }
    },
  })

  kiosk.KioskEditView = Backbone.View.extend({
    el: "#imagemap",

    events: {
      "click #editThisPageButton": "editThisPage",
      "click #newPopupButton": "newPopup",
      "click #newPageButton": "newPage",
      "click #newLinkButton": "newLink"
    },

    initialize: function() {
      _.bindAll(this, "editThisPage", "newPopup", "newPage", "newLink");

      this.listenTo(this.options.controller.dispatcher, "new-page-key", this.newPage);
      this.listenTo(this.options.controller.dispatcher, "new-popup-key", this.newPopup);
      this.listenTo(this.options.controller.dispatcher, "new-link-key", this.newLink);
      this.listenTo(this.options.controller.dispatcher, "edit-this-page-key", this.editThisPage);
    },

    render: function () {
      var mode = this.options.controller.mode;

      if(mode === "edit") {
        this.$("#editor_mode").show();
        //stop_idle_timer();
        this.$(".image_button").resizable({handles: "all"}).draggable().css(
          {
            "border": "2px solid white",
            "background": "rgba( 255, 255, 191, 0.5)"
          }).show().off("click");
        $(".image_button > .link").css({"display": "inline"});
      } else {
        //start_idle_timer();
        $("#editor_mode").hide();
        $(".image_button").resizable('destroy').draggable('destroy').css(
          {
            "border": "none",
            "background": "none",
            "color": "none"
          });
        $(".image_button > .link").css({"display": "none"});
      }
    },

    "editThisPage": function(e) {
      if (e) { e.preventDefault(); }
      console.log("edit this page!");
      return false;
    },

    "newPopup": function(e) {
      if (e) { e.preventDefault(); }
      console.log("newPopup");
      return false;
    },

    "newPage": function(e) {
      if (e) { e.preventDefault(); }
      console.log("newPage");
      return false;
    },

    "newLink": function(e) {
      if (e) { e.preventDefault(); }
      console.log("newLink");
      return false;
    },
  });

  kiosk.KioskEditPageDialog = Backbone.View.extend({
    el: "#editPageDialog",

    render: function() {
    }
  });
})(window.kiosk = window.kiosk || {}, Backbone, jQuery, _);