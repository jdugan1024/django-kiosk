import StringIO

from django.http import Http404, HttpResponseRedirect, HttpResponse, HttpResponseForbidden
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers
from django.http import Http404

try:
    import json
except ImportError:
    import simplejson as json

from kiosk.models import KioskItem, KioskPageLinkLocation, KioskItemForm

def index(request, page=None):
    if not page:
        page = "index"

    page = get_object_or_404(KioskItem, name=page, type='page')

    return render_to_response('kiosk/index.html',
            {"page": page}, context_instance=RequestContext(request))

#@csrf_exempt
def loc_data(request, page_name, pk=None):
    page = get_object_or_404(KioskItem, name=page_name, type='page')

    if request.method == 'GET':
        l = []

        for link in page.link_locations.all():
            l.append(link.serialize())

        return HttpResponse(json.dumps(l))

    if not request.user.is_staff:
        return HttpResponseForbidden("Permission denied.")

    if request.method == 'POST':
        print request.body
        data = json.loads(request.body)
        data['page'] = page
        data['link'] = get_object_or_404(KioskItem, type=data['type'], name=data['name'])
        del data['name']
        del data['type']

        obj = KioskPageLinkLocation(**data)
        obj.save()

        r = json.dumps(obj.serialize())
    elif request.method == 'PUT':
        obj = get_object_or_404(KioskPageLinkLocation, pk=pk)
        data = json.loads(request.body)

        del data['id']
        del data['page']
        del data['link']
        del data['name']

        for k, v in data.iteritems():
            setattr(obj, k, v)

        obj.save()

        r = json.dumps(obj.serialize())
    elif request.method == 'DELETE':
        obj = get_object_or_404(KioskPageLinkLocation, pk=pk)
        obj.delete()
        return HttpResponse()
    else:
        raise Http404()

    return HttpResponse(r)

def link_data(request):
    items = KioskItem.objects.order_by("name").all()
    l = []
    for item in items:
        if item.type == 'page':
            l.append(('/' + item.name, item.name))
        else:
            l.append(('#' + item.name, item.name))

    l.sort(key=lambda x: x[1])

    return HttpResponse(json.dumps(l))

def not_kiosk_item(request, item=None):
    r = {}
    if request.method == "GET":
        obj = get_object_or_404(KioskItem, name=item)
        return HttpResponse(serializers.serialize("json", [obj]).strip("[]"))
    elif request.method == "POST":
        print json.dumps(request.POST, indent=4)
        for f in request.FILES:
            print f

        f = KioskItemForm(request.POST, request.FILES)
        print "VALID?", f.is_valid()
        if not f.is_valid():
            print "ERR", f.errors
            errdict = { 'status' : "Error",
                       'errors' : [(k, v) for k, v in f.errors.items()] }
            print errdict
            return HttpResponse(json.dumps(errdict))

        obj = f.save()
        if obj.type == 'page':
            link = "/" + obj.name
        else:
            link = "#" + obj.name
        r['status'] = "OK"
        r['link'] = link

    return HttpResponse(json.dumps(dict(status="OK", link=link)))


def kiosk_item(request, item_type=None, item_name=None):
    r = None
    if request.method == 'GET':
        if not item_name:
            r = []
            for obj in KioskItem.objects.all():
                r.append(obj.serialize())
        else:
            obj = get_object_or_404(KioskItem, name=item_name)
            r = obj.serialize()
    elif request.method == "POST":
        print json.dumps(request.POST, indent=4)
        for f in request.FILES:
            print f

        f = KioskItemForm(request.POST, request.FILES)
        print "VALID?", f.is_valid()
        if not f.is_valid():
            print "ERR", f.errors
            errdict = { 'status' : "Error",
                       'errors' : [(k, v) for k, v in f.errors.items()] }
            print errdict
            return HttpResponse(json.dumps(errdict))

        obj = f.save()
        r = obj.serialize()
        r['status'] = "OK"
    elif request.method == "PUT":
        obj = get_object_or_404(KioskItem, type=item_type, name=item_name)
        put_data = json.loads(request.raw_post_data)
        f = KioskItemForm(put_data, request.FILES, instance=obj)
        if not f.is_valid():
            print "ERR", f.error
            errdict = { 'status' : "Error",
                       'errors' : [(k, v) for k, v in f.errors.items()] }
            print errdict
            return HttpResponse(json.dumps(errdict))

        obj = f.save()
        r = obj.serialize()
        r['status'] = "OK"

    return HttpResponse(json.dumps(r))

def update_kiosk_item_images(request, item_type, item_name):
    print item_type, item_name, request.method
    if request.method != 'POST':
        return Http404()

    if item_type not in ['page', 'popup']:
        return Http404()

    obj = get_object_or_404(KioskItem, type=item_type, name=item_name)
    f = KioskItemForm(request.POST, request.FILES, instance=obj)
    obj = f.save()
    print obj
    r = obj.serialize()
    r['status'] = "OK"

    return HttpResponse(json.dumps(r))