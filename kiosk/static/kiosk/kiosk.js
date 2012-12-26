var kiosk = (function() {
  var mode = "view";
  var in_dialog = 0;
  var page = "";
  var links;
  var idle_for = 0;
  var can_edit = false;

  function edit_mode() {
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
      console.log("kb event, in dialog");
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
    } else if(mode == "edit" && event.which == 115) { // s
      console.log("save");
      save_locations();
    } else if(mode == "edit" && event.which == 110) { // n
      event.preventDefault();
      $("#dialog-form").dialog("open");
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
    $.post('/_loc/'+page, {'links': JSON.stringify(l)});
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
        $("#link").append('<option value="' + v[0] + '">' + v[1] + '</option>');
      });
    });
  };

  function create_dialogs() {
    $( "#dialog-form" ).dialog({
      autoOpen: false,
      height: 300,
      width: 350,
      modal: true,
      buttons: {
        "Create new link": function() {
          var name = $("#name").val();
          var link = $("#link").val();
          var valid = true;

          console.log("create", name, link);

          if ( valid ) {
            edit_mode();
            $( this ).dialog( "close" );
            link_div(link);
            edit_mode();
          }
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      },
      close: function() {
        in_dialog = 0;
      },
      open: function() {
        in_dialog = 1;
        $("#dialog-form").keypress(function(e) {
          if (e.which == $.ui.keyCode.ENTER) {
            $(this).parent().find("button:eq(0)").trigger("click");
          }
        });
      }
    });
    $("#reset-message").dialog({
      modal: true,
      autoOpen: false,
      zIndex: 9000,
      buttons: {
        Cancel: function() {
          $(this).dialog( "close" );
        },
        Reset: function() {
          $(this).dialog( "close" );
          reset();
        }
      }
    });
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
    $("#reset-message").dialog("open");
  };

  function countdown() {
    $("#countdown").html(10 - idle_for);
    idle_for++;
  }

  function reset() {
    console.log("reset")
    if(page == "index") {
      $.fancybox.close();
      $("#reset-message").dialog("close");
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
        // only run the idle timeout code on the actual kiosk
        $.idleTimer(30000);
        $(document).bind("idle.idleTimer", idle);
        $(document).bind("active.idleTimer", active);
      }
    }
  }
})();
