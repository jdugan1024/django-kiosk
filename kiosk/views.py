import StringIO

from django.http import Http404, HttpResponseRedirect, HttpResponse, HttpResponseForbidden
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers

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

@csrf_exempt
def loc_data(request, page):
    page = get_object_or_404(KioskItem, name=page, type='page')

    if request.method == 'POST':
        if not request.user.is_staff:
            return HttpResponseForbidden("Permission denied.")

        links = json.loads(str(request.POST['links']))
        page.link_locations.all().delete()
        for link in links:
            link['link'] = KioskItem.objects.get(name=link['link'][1:])
            link['page'] = page
            kpll = KioskPageLinkLocation(**link)
            kpll.save()

        r = json.dumps(dict(status="OK"))
    elif request.method == 'GET':
        l = []
        for lo in page.link_locations.all():
            if lo.link.type == "page":
                link = "/" + lo.link.name
            else:
                link = "#" + lo.link.name
            l.append(dict(top=lo.top,left=lo.left,width=lo.width,height=lo.height,link=link))
        r = json.dumps(l)
    else:
        return Http404()

    return HttpResponse(r)

def popup_data(request, page):
    page = get_object_or_404(KioskItem, name=page, type='popup')

    if request.method == 'POST':
        print json.dumps(json.loads(request.POST['links']), indent=4)
        return Http404()
    elif request.method == 'GET':
        return render_to_response('kiosk/popup.html',
            {"page": page}, context_instance=RequestContext(request))
    else:
        return Http404()

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

def update_page_background(request, page):
    page = get_object_or_404(KioskItem, name=page, type='page')


    r = {}
    if request.FILES and request.FILES.get('file_upload'):
        f = request.FILES.get('file_upload')
        page.page_image = f
        page.save()
        r['status'] = "OK"
    else:
        r['status'] = "Error: no file attached"

    return HttpResponse(json.dumps(r))

def kiosk_item(request, item=None):
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