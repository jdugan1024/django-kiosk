import StringIO

from django.http import Http404, HttpResponseRedirect, HttpResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers
from django.http import Http404
from django.core.files.storage import FileSystemStorage

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
        data['link'] = get_object_or_404(KioskItem, type=data['type'], name=data['name'])
        del data['name']
        del data['type']

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

        return HttpResponse(json.dumps(r))

    if not request.user.is_staff:
        return HttpResponseForbidden("Permission denied.")

    if request.method == "POST":
        data = json.loads(request.body)
        print "POST data", data

        if KioskItem.objects.filter(name=data['name'], type=data['type']).count() > 0:
            return HttpResponseBadRequest("Duplicate item")

        obj = KioskItem(**data)
        obj.save()
        r = obj.serialize()
    elif request.method == "PUT":
        obj = get_object_or_404(KioskItem, type=item_type, name=item_name)
        data = json.loads(request.body)
        print "PUT data", data

        del data['id']
        del data['page_image']
        del data['popup_image1']
        del data['popup_image2']

        for k, v in data.iteritems():
            setattr(obj, k, v)

        obj.save()
        r = obj.serialize()
    elif request.method == "DELETE":
        obj = get_object_or_404(KioskItem, type=item_type, name=item_name)

        obj.delete()
        r = ""
    else:
        raise Http404()

    return HttpResponse(json.dumps(r))

def kiosk_item_image(request, item_type, item_name):
    if request.method != 'POST':
        return Http404()

    if item_type not in ['page', 'popup']:
        return Http404()

    if not request.user.is_staff:
        return HttpResponseForbidden("Permission denied.")

    obj = get_object_or_404(KioskItem, type=item_type, name=item_name)

    old_files = []
    for k, v in request.FILES.items():
        old_files.append(getattr(obj, k).name)
        setattr(obj, k, v)

    obj.save()

    fs =  FileSystemStorage()
    for f in old_files:
        if f:
            fs.delete(f)

    #print json.dumps(obj.serialize(), indent=4)
    r = obj.serialize()

    return HttpResponse(json.dumps(r))