(function(kiosk, Backbone, $, _) {
    // borrowed from: https://github.com/thomasdavis/backbonetutorials/tree/gh-pages/videos/beginner#jquery-serializeobject 
    $.fn.serializeObject = function() {
      var o = {};
      var a = this.serializeArray();
      $.each(a, function() {
          if (o[this.name] !== undefined) {
              if (!o[this.name].push) {
                  o[this.name] = [o[this.name]];
              }
              o[this.name].push(this.value || '');
          } else {
              o[this.name] = this.value || '';
          }
      });
      return o;
    };

    // similar function to get values of file elements
    $.fn.serializeFormFiles = function() {
        var o = {};
        $(this).find(":file").each(function(i,e) {
            o[$(e).attr("name")] = $(e).val();
        });
        return o;
    };

    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    kiosk.Controller = {
        init: function(can_edit) {
            var self = this;
            console.log("can_edit", can_edit);
            this.can_edit = can_edit;
            this.dispatcher = _.clone(Backbone.Events);

            this.idle_timeout = 30; // seconds
            this.idle_message_timeout = 10; // seconds

            console.log("models");
            this.models = {
                "rootModel": new kiosk.RootModel(),
                "pageModel": new kiosk.ItemModel(),
                "linkCollection": new kiosk.LinkCollection(),
                "itemCollection": new kiosk.ItemCollection()
            }

            this.models.itemCollection.fetch({
                'success': function(popups) {
                    console.log("loaded ItemCollection: ", popups, popups.get("infinera"));
                }
            });

            console.log("view");
            this.views = {
                "pageView": new kiosk.PageView({model: this.models.pageModel, "controller": this}),
                "linksView": new kiosk.LinkCollectionDisplayView({collection: this.models.linkCollection, "controller": this}),
                "editView": new kiosk.EditView({"controller": this})
            };

            console.log("router");
            this.router = new kiosk.Router({"controller": this});

            this.models.rootModel.on("change:mode", this.views.editView.render, this.views.editView);
            this.models.pageModel.bind('sync', this.views.pageView.render, this.views.pageView);
            this.models.linkCollection.bind('sync', this.views.linksView.render, this.views.linksView);
            this.models.linkCollection.bind('remove', this.views.linksView.render, this.views.linksView);
            this.models.linkCollection.bind('add', this.views.linksView.render, this.views.linksView);

            self.in_dialog = false;
            self.mode = "view";

            _.bindAll(this, "handleKeypress", "idle", "idle_countdown", "idle_reset",
                            "idle_active", "start_idle_timer", "stop_idle_timer");

            $(document).keypress(kiosk.Controller.handleKeypress);

            var csrf = readCookie("csrftoken");
            if (csrf) {
                Backbone.originalSync = Backbone.sync;
                Backbone.sync = function(method, model, options) {
                    options || (options = {});
                    options.headers = { "X-CSRFToken": csrf };
                    return Backbone.originalSync(method,model,options);
                };
             }

            Backbone.history.start();
            kiosk.Controller.start_idle_timer();
        },

        handleKeypress: function (event) {
            if(this.models.rootModel.get("inDialog")) { 
                //if (event.which == 13) { event.preventDefault(); }
                //console.log("kb event, in dialog");
                return;
            }
            console.log("keypress_this", this);
            console.log("keypress", event.which);
            if(event.which == 101 && this.can_edit) { // e
                console.log("root mode", this.models.rootModel.get("mode"));
                if(this.models.rootModel.get("mode") == "edit") {
                    this.models.rootModel.set("mode", "view");
                } else {
                    this.models.rootModel.set("mode", "edit");
                }
                console.log(this.models.rootModel.get("mode") + " mode")
            } else if(event.which == 107) { // k
                console.log("kiosk toggle");
                if($("body").css("overflow") == 'hidden') {
                    $("body").css("overflow", "visible");
                } else {
                    $("body").css("overflow", "hidden");
                }
            } else if(this.models.rootModel.get("mode") === "edit") {
                console.log("check edit keys");
                switch (event.which) {
                    case 108: // l
                        event.preventDefault();
                        this.dispatcher.trigger("new-link-key");
                        break;
                    case 110: // n
                        event.preventDefault();
                        this.dispatcher.trigger("new-page-key");
                        break;
                    case 112: // p
                        event.preventDefault();
                        this.dispatcher.trigger("new-popup-key");
                        break;
                    case 116: // t
                        event.preventDefault();
                        this.dispatcher.trigger("edit-this-page-key");
                        break;
                }
            } else {
                console.log("unknown keypress");
            }
        },
 
        idle: function() {
            console.log("idle timeout")
            $("#countdown").html(this.idle_message_timeout);
            this.idle_for = 1;
            $.timer('idle_message_timer', kiosk.Controller.idle_countdown, 1, {
                timeout: this.idle_message_timeout, 
                finishCallback: kiosk.Controller.idle_reset
            }).start();
            $("#resetPopup").modal("show");
        },

        idle_countdown: function() {
            $("#countdown").html(this.idle_message_timeout - this.idle_for);
            this.idle_for++;
        },

        idle_reset: function() {
            console.log("reset")
            $("#resetPopup").modal("hide");
            $("#popup").modal("hide");
            if(this.models.pageModel.get("name") !== "index") {
                this.router.navigate("index", {trigger: true});
            }
        },

        idle_active: function() {
            console.log("activate")
            $.timer('idle_message_timer', null);
            $("#resetPopup").modal("hide");
        },

        start_idle_timer: function() {
            this.idle_for = 0;
            $.idleTimer(this.idle_timeout * 1000);
            $(document).bind("idle.idleTimer", kiosk.Controller.idle);
            $(document).bind("active.idleTimer", kiosk.Controller.idle_active);
        },

        stop_idle_timer: function() {
            $.idleTimer('destroy');
            $.timer('idle_message_timer', null);
        }
    }

    //
    // Router
    //
    // handles transitions between pages
    //

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
            this.controller.models.pageModel.set("id", "page/" + page, {"silent": true});
            this.controller.models.pageModel.fetch();

            this.controller.models.linkCollection.page = page;
            this.controller.models.linkCollection.loaded = false;
            this.controller.models.linkCollection.fetch({
              success: function(links) { links.loaded = true; }
            });
            console.log("show page done");
        }
    }),

    //
    // RootModel
    //
    // keeps global state

    kiosk.RootModel = Backbone.Model.extend({
        defaults: {
            mode: "view",
            inDialog: false
        }
    });

    //
    // Item model 
    //
    // details about a kiosk item, either a Page or a Popup
    // A page is a the top level item and can be though of as a section of the kiosk
    // The valid fields for an Item of type page are:
    //
    //      name: string which is used to refer to the page, it is the id of the page
    //      title: string which is used when displaying this page
    //      type: string, always set to 'page' for pages
    //      page_image: the image to use for the page
    //
    //
    // A popup has details about some section of a page and pops up a small window
    // with that information.  The valid fields for an Item of type popup are:
    //
    //      name: string which is used to refer to the popup, it is the id of the popup
    //      title: string which is used when displaying this popup
    //      type: string, always set to 'popup' for popups
    //      text: string, HTML allowed, text for the body of the popup
    //      url: a string providing a URL for more information
    //      popup_image1: an image to be used in the popup
    //      popup_image2: an image to be used in the popup
    //
    // Note: files don't play nicely with PUT

    kiosk.ItemModel = Backbone.Model.extend({
        urlRoot: "/_kiosk_item/",
        imageUrlRoot: "/_kiosk_item_image/",

        defaults: {
            "name": undefined,
            "title": undefined,
            "type": undefined,
  
            // pages only
            "page_image": undefined,
 
            // popups only 
            "text": undefined,
            "url": undefined,
            "popup_image1": undefined,
            "popup_image2": undefined
        },

        //
        // uploadFile
        //
        // workaround for lack of support for files in backbone.js, we POST to a separate resource
        //
        uploadFiles: function(data, callback) {
            //var data = new FormData($("#addNewPopup form")[0]);
            var self = this;
            data.append('csrfmiddlewaretoken', readCookie("csrftoken"));
            $.ajax({
                url: this.imageUrlRoot + this.get("type") + "/" + this.get("name"),
                type: 'POST',
                data: data,
                processData: false,
                contentType: false,
                success: function(response) {
                    var data = $.parseJSON(response);
                    console.log("image success:", response);
                    if(callback) {
                        callback(response);
                    }
                }
            });
        },

        validate: function(attr, options) {
            console.log("validate", this, attr);
            err = {}
            if(!attr.name || attr.name === "") {
                err.name = "must not be empty";
            }
            // we also validate the the name is unique in the view where we have
            // access to the collection

            if(!attr.title || attr.title === "") {
                err.title = "must not be empty";
            }

            if(!attr.type) {
                err.type = "type must be set";
            } else if(attr.type === "page") {
                if(this.isNew() && !attr.page_image) {
                    err.page_image = "must specify a page image";
                }
            } else if(attr.type == "popup") {
                if(this.isNew() && !attr.popup_image1) {
                    err.popup_image1 = "must specify at least one popup image";
                }
                if(!attr.text) {
                    err.text = "must specify some text";
                }
            } else {
                err.type = "unknown type: " + attr.type;
            }

            if (!$.isEmptyObject(err)) {
                return err
            }
        }
    }),

    //
    // ItemCollection
    //
    // All kiosk items
    //

    kiosk.ItemCollection = Backbone.Collection.extend({
        model: kiosk.ItemModel,
        comparator: 'id',
        url: "/_kiosk_item"
    });

    //
    // Link model
    //
    // location and detail of a link
    //

    kiosk.Link = Backbone.Model.extend({
        defaults: {
            top: 50,
            left: 10,
            width: 200,
            height: 50
        },

        url: function() {
            console.log("Link url", this)
            if (this.isNew()) {
                return "/_loc/" + this.get("page");
            } else {
                return "/_loc/" + this.get("id");
            }
        }
    }),

    //
    // LinkCollection
    //
    // Links for this page
    //

    kiosk.LinkCollection = Backbone.Collection.extend({
        model: kiosk.Link,
        comparator: 'id',
        url: function() {
            var url = window.location.origin + "/_loc/" + this.page;
            return url;
        }
    }),

    //
    // LinkCollectionDisplayView
    //
    // manages all the links on the page for "display" mode
    //

    kiosk.LinkCollectionDisplayView = Backbone.View.extend({
        el: "#LinkCollection",

        events: {
          "click .image_button": "click",
        },

        render: function() {
            var self = this;
            console.log("render LinkCollectionView", this.linkViews, this.options);
            this.$(".linkItem").remove();

            _.each(this.collection.models, function(model) { 
                view = new kiosk.LinkView({
                    model: model,
                    parentEl: self.$el,
                    itemCollection: self.options.controller.models.itemCollection,
                    linkCollection: self.options.controller.models.linkCollection,
                    rootModel: self.options.controller.models.rootModel,
                    controller: self.options.controller
                });
                self.options.controller.models.rootModel.bind("change:mode", view.changeMode, view);
                view.render();
            });
        }
    }),

    //
    // LinkView
    //
    // view for each link in LinkCollectionDisplayView in "display" mode
    // handles clicks on each link by:
    //    informing the router if it is a page
    //    rendering a PopupView if it is a popup
    //
    // In edit mode:
    //    handles edit clicks on the link name
    //    handles delete clicks on the link delete button

    kiosk.LinkView = Backbone.View.extend({
        events: {
            "click": "click",
            "click .linkName": "edit",
            "click .linkDelete": "delete"
        },

        initialize: function () {
            _.bindAll(this, "updatePosition", "updateSize", "changeMode");
        },

        render: function() {
            var props = {
                link: this.model.get("link"),
                top: this.model.get("top"),
                left: this.model.get("left"),
                width: this.model.get("width"),
                height:this.model.get("height")
            }

            var link = $(_.template($("#linkTemplate").html(), props));
            this.setElement(link);
            // XXX the append must come before the changeMode, why?
            this.options.parentEl.append(this.$el);
            this.changeMode();

            return this;
        },

        changeMode: function() {
            var mode = this.options.rootModel.get("mode");

            if (mode === "view") {
                this.$el.resizable('destroy').draggable('destroy').css({
                    "border": "none",
                     "background": "none",
                     "color": "none"
                });
                this.$el.removeClass("linkVisible");
                this.$(".linkName").css({"display": "none"});
                this.$(".linkDelete").css({"display": "none"});
                //this.$el.bind("click", this.click, this);
            } else {
                this.$el.resizable({
                    handles: "all",
                    stop: this.updateSize
                }).draggable({
                    stop: this.updatePosition
                });
                this.$el.addClass("linkVisible");
                this.$(".linkName").css({"display": "inline"});
                this.$(".linkDelete").css({"display": "inline"});
            }
        },

        updatePosition: function(event, ui) {
            console.log("drag stop", ui.position.left, ui.position.top);
            this.model.set("left", ui.position.left);
            this.model.set("top", ui.position.top);
            this.model.save();
        },

        updateSize: function(event, ui) {
            console.log("resize stop", ui.size);
            this.model.set("width", ui.size.width);
            this.model.set("height", ui.size.height);
            this.model.save();
        },

        click: function(e) {
            if (this.options.rootModel.get("mode") === "edit") {
                if (!e.shiftKey) { return; }
                new kiosk.LinkDialogView({
                    model: this.model,
                    itemCollection: this.options.controller.models.itemCollection,
                    linkCollection: this.options.controller.models.linkCollection,
                    rootModel: this.options.controller.models.rootModel,
                    action: "Update"
                }).render();
                return;
            }
            console.log("LinkItem click", this.model);
            if (this.model.get("type") == "page") {
                this.options.controller.router.navigate(this.model.get("name"), {"trigger": true});
            } else {
                console.log("item collection", this.options.itemCollection);
                var popup_details = this.options.itemCollection.findWhere({
                    name: this.model.get("name"),
                    type: "popup"
                });
                console.log("popup_details", popup_details);
                var template = _.template($('#popupTemplate').html(), {popup: popup_details});
                var popup = $("#popup");
                popup.html(template);
                popup.modal();
                popup.modal("show");
            }
        },

        edit: function(e) {
            // the parent div also has a handler but for other events
            e.stopPropagation();
            console.log("LinkItem edit click", e, this.model, this.options.itemCollection);
            var model = this.options.itemCollection.get(this.model.get("link"));
            console.log("MModel", model);
            var dialog = new kiosk.EditItemDialogView({
                model: model,
                action: "Update",
                itemCollection: this.options.controller.models.itemCollection,
                linkCollection: this.options.controller.models.linkCollection,
                rootModel: this.options.controller.models.rootModel
            });
            dialog.render();
        },

        delete: function(e) {
            e.stopPropagation();
            console.log("LinkItem delete click", e);
            this.options.linkCollection.remove(this.model);
            this.model.destroy();
        }
    }),

    //
    // PageView
    //
    // manages setting the page image and other housekeeping
    //

    kiosk.PageView = Backbone.View.extend({
        el: "#Page",

        render: function () {
            console.log("render PageView", this, this.model.loaded);
            if (this.model.get("name")) {
                var url = this.model.get('page_image');
                console.log("updating to", url);
                this.$el.css("background-image", "url(" + url + ")");
            } else {
                console.log("do nothing or show loader?")
            }
        },
    });

    kiosk.EditView = Backbone.View.extend({
        el: "#EditMenu",

        events: {
          "click #newPopupButton": "newPopup",
          "click #newPageButton": "newPage",
          "click #newLinkButton": "newLink"
        },

        initialize: function() {
            _.bindAll(this, "newPopup", "newPage", "newLink");

            this.listenTo(this.options.controller.dispatcher, "new-page-key", this.newPage);
            this.listenTo(this.options.controller.dispatcher, "new-popup-key", this.newPopup);
            this.listenTo(this.options.controller.dispatcher, "new-link-key", this.newLink);
        },

        render: function () {
            var mode = this.options.controller.models.rootModel.get("mode");
            console.log("EditView", mode);

            if(mode === "edit") {
                this.$el.show();
                //stop_idle_timer();
            } else {
                this.$el.hide();
                //start_idle_timer();
            }
        },

        newPage: function(e) {
            if (e) { e.preventDefault(); }
            console.log("newPage");
            var model = new kiosk.ItemModel({type: "page"});
            var popup = new kiosk.EditItemDialogView({
                model: model, 
                action: "Add",
                itemCollection: this.options.controller.models.itemCollection,
                linkCollection: this.options.controller.models.linkCollection,
                rootModel: this.options.controller.models.rootModel
            });
            popup.render();
        },

        newPopup: function(e) {
            if (e) { e.preventDefault(); }
            console.log("newItem");
            var model = new kiosk.ItemModel({type: "popup"});
            var popup = new kiosk.EditItemDialogView({
                model: model, 
                action: "Add",
                itemCollection: this.options.controller.models.itemCollection,
                linkCollection: this.options.controller.models.linkCollection,
                rootModel: this.options.controller.models.rootModel
            });
            popup.render();
        },

        newLink: function(e) {
            if(e) { e.preventDefault(); }
            console.log("new link", this.options.controller.models);
            new kiosk.LinkDialogView({
                model: new kiosk.Link({page: this.options.controller.models.pageModel.get("name")}),
                itemCollection: this.options.controller.models.itemCollection,
                linkCollection: this.options.controller.models.linkCollection,
                rootModel: this.options.controller.models.rootModel,
                action: "Add"
            }).render();
        }
    });

    //
    // EditItemDialogView
    //
    // Handles editing, creating and deleting Kiosk Items
    //

    kiosk.EditItemDialogView = Backbone.View.extend({
        el: "#editItemDialog",
  
        events: {
            "click .btn-primary": "click",
            "click .btn-danger": "delete"
        },

        initialize: function() {
            _.bindAll(this, "click", "delete", "_set_form_error");
        },

        render: function() {
            var self = this;
            console.log("render item edit", this);
            var template = _.template($('#editItemDialogTemplate').html(), {
                model: this.model, 
                action: this.options.action
            });
            this.popup = $("#editItemDialog");
            this.popup.html(template);
            this.popup.modal();
            this.options.rootModel.set("inDialog", true);
            this.popup.modal("show"); 
            this.popup.on("hidden", function() {
                self.options.rootModel.set("inDialog", false);
                self.undelegateEvents();
            });
        },

        click: function() {
            var self = this;
            console.log("click in edit page form, this:", this);
            var formData = this.$("form").serializeObject();
            var fileData = this.$("form").serializeFormFiles();
            formData = _.extend(formData, fileData);

            console.log("form data", formData);

            var fileFormData = new FormData();
            var numFiles = 0;
            _.each(fileData, function(v, k) {
                if (v) {
                    console.log("file to upload", k, this.$("form [name=" + k + "]")[0].files[0]);
                    fileFormData.append(k, this.$("form [name=" + k + "]")[0].files[0]);
                    numFiles += 1;
                }
            });

            this.model.set(formData);

            var dups = this.options.itemCollection.where({
                name: this.model.get("name"),
                type: this.model.get("type")
            });
            if (dups.length) {
                this._set_form_error("name", "that name is already in use");
                return false;
            }

            this.model.on("invalid", function(model, errors) {
                console.log("ERROR", model, errors);
                self.$("form .text-error").remove();
                _.each(errors, function(msg, field) {
                    console.log("err", field, msg);
                    self._set_form_error(field, msg);
                });
                self.model.off("invalid");
            });
            this.model.save({}, {
                success: function(model, response) {
                    console.log("model save successful, now to save images:", numFiles);
                    if(numFiles) {
                        model.uploadFiles(fileFormData, function (response) {
                            console.log("total success", response, model);
                            // ugh, can't seem to get this to work without going to get them all
                            self.options.itemCollection.fetch();
                        });
                    }
                    self.popup.modal("hide");
                },
                error: function(model, xhr) {
                    console.log("save failed", model, xhr);
                }
            });
        },

        _set_form_error: function(field, msg) {
            var control = this.$("form [name="+ field +"]");
            control.prev().append(" <span class='text-error'>"+ msg +"</div>");
        },

        delete: function() {
            console.log("delete! item!", this.model.get("id"), this.model);
            this.options.itemCollection.remove(this.model);
            this.options.linkCollection.remove(
                this.options.linkCollection.where({link: this.model.get("id")}));
            this.model.destroy();

            this.popup.modal("hide");
        }
    });

    //
    // LinkDialogView
    //

    kiosk.LinkDialogView = Backbone.View.extend({
        el: "#LinkDialog",

        events: {
            "click .btn-primary": "click"
        },

        initialize: function() {
            _.bindAll(this, "click");
        },

        render: function() {
            var self = this;
            var template = _.template($("#LinkDialogTemplate").html());
            this.dialog = $("#LinkDialog");
            this.dialog.html(template({
                items: this.options.itemCollection.models,
                action: this.options.action,
                link: this.model.get("link")
            }));
            this.dialog.modal();
            this.options.rootModel.set("inDialog", true);
            this.dialog.modal("show");
            this.dialog.on("hidden", function() {
                self.options.rootModel.set("inDialog", false);
                // XXX: without this there were zombies attached to the submit button
                // XXX: is this the last of the references to this view or are we leaking memory?
                self.undelegateEvents();
            });
        },

        click: function() {
            var self = this;
            var link = this.$("select")[0].value;
            this.model.set("link", link);
            var parts = link.split("/");
            this.model.set("type", parts[0]);
            this.model.set("name", parts[1]);
            this.model.save({}, {
                success: function(model, response) {
                    self.options.linkCollection.add(model);
                },
                error: function(model, xhr) {
                    console.log("error saving link", model, xhr);
                }
            });

            this.dialog.modal("hide");
        }
    });
})(window.kiosk = window.kiosk || {}, Backbone, jQuery, _);