//スクリプト文字コードはUTF-8
//--------------------- about this script -------------------------
STDENV.prototype.meta = {
"@prefix": "<http://purl.org/net/ns/doas#>",
"@about": "<http://www.kanzaki.com/parts/std.js>", a: ":JavaScript",
 title: "The Web KANZAKI standard utility scripts",
 shortdesc: "ulitity scripts to be used throughout this site.",
 created: "2002-05-08", release: {revision: "2.93", created: "2017-10-02"},
 author: {name: "KANZAKI, Masahide", homepage: "<http://www.kanzaki.com/>"},
 license: "<http://creativecommons.org/licenses/LGPL/2.1/>"};
//-----------------------------------------------------------------
//Use C:\Users\mkanzaki\Documents\scripts\filefilter\js-nocomment.pl to trim comments
/*The above is a JSON representation of metadata of this script, which
  can be converted to RDF/Turtle format by /parts/json-turtle.js.
  Most scripts in this site have this sort of metadata at the top.
  Also, these metadata can be accessed via ge.about(prototype_name). */

if(window.DOMParser){
	/** redefine document.write for XHTML, if DOMParser presents */
	document.write = function(){
		var current = (function(e){
			if(e && e.nodeName.toLowerCase() == 'script') return e
			else if(e.lastChild) return arguments.callee(e.lastChild)
			else return e;
		})(document);
		var p = current.parentNode;
		var r = (function(){
			var parser = new DOMParser;
			try{
				return parser.parseFromString('<div xmlns="http://www.w3.org/1999/xhtml">'+arguments[0]+'</div>', 'application/xhtml+xml').documentElement;
			}catch(e){
				return document.createTextNode(e);
			}
		})(arguments[0]);
		if (r.childNodes){
			for(var i = 0, len = r.childNodes.length; i < len; i++) {
				var cnode = r.childNodes[i];
				//cannot simply append a text node
				if(cnode.nodeType == 3){
					p.appendChild(document.createTextNode(cnode.data));
				}else if(cnode){
					p.appendChild(document.importNode(cnode,true));
				}
			}
		}
	}
	/** redefine document.createElement esp for Safari */
	document.createElement = function(elt){
		return document.createElementNS('http://www.w3.org/1999/xhtml',elt);
	}
}

var ge = new STDENV();
ge.noframe();
ge.linkattrs(); 
ge.ecomment();

/** web page initializer. to be called from each page's onload(). */
function init(lv){
	if(! document.getElementById) return;
	//OpenSeadragonがgeをgreater than関数として利用していてエラーになるのでコピーして実行
	//ge自身の名前を変えるのは影響が大きすぎる
	var myge = ge;
	//if(ge.isIE && lv != 'slide') {window.onresize = ge.maxwidth;ge.maxwidth();}
	//if(ge.initvars() == -1) return;
	myge.initvars();
	//ge.translink();
	myge.rdfadisclaimer();
	if(lv == 'min' || lv == 'slide') {
		//ge.notify(''); return;
	}else{
		myge.preptoc();
		myge.hrefp();
		myge.pflb();
		//ge.poor_rdfa();
	}
	myge.notify('');
	myge.checkssl();
	//if there is something to do after initialization
	if(typeof(postinit) == "function") postinit();
}

/**
 * Standard environment object. To be instantiated as 'ge'. 
 * All function prototypes are private unless specified as @access public.
 * Some properties are public accessible:
 * @property	ge.isIE : browser type (also, isMozilla, etc.)
 * @property	ge.dbase : DOM document base object
 * @property	ge.userLang : browser's default language
 * @property	ge.localhost : current host type
 * @property	ge.orguri : document's authorized URI
 * @property	ge.cifoot : DOM object for document's last address element
 */
function STDENV(){
	var ua = navigator.userAgent;
	this.isOpera = this.isIE = this.isMacIE = this.isWinIE = this.isSafari = this.isMozilla = this.isIcab = false;
	if(ua.indexOf('Opera') != -1) this.isOpera = true;
	else if(ua.indexOf('MSIE') != -1) {
		ua.match(/MSIE ([\d\.]+)/);
		this.isIE = RegExp.$1;
		if(ua.indexOf('Mac') != -1) this.isMacIE = true;
		else if(ua.indexOf('Win') != -1) this.isWinIE = true;
	}
	else if(ua.indexOf('Safari') != -1) this.isSafari = true;
	else if(ua.indexOf('Gecko') != -1) this.isMozilla = true;
	else if(ua.indexOf('iCab') != -1) this.isIcab = true;
	this.usrLang = (navigator.userLanguage || navigator.language);
	// popup toc object
	this.toc = new Object;
	this.creator = {name:"KANZAKI, Masahide",fn:"kanzaki",mailTld:".cc"}
	// for accesskey function of TOC
	this.nkeylink = [];
	this.mw = {check:880, set:860, ad:1000, showad:false};
	this.head = document.getElementsByTagName("head")[0];
	this.ptocImg = " <img src='/parts/ptoc.gif' class='tocpic' title='Table of Contents of this page' alt='' />";
	this.ptocMsg = "Click heading, and Table of Contents will pop up";

//--------------------  prototypes (STDENV continues) --------------

/**
 * Initialize environtmet variables to be used by other functions.
 * Some of them can be accessed from public as ge.*. See properties
 * described at STDENV().
 */
STDENV.prototype.initvars = function(){
	if((this.oH1 = document.getElementsByTagName("h1").item(0))){
		if(this.oH1.getAttribute("id")){
			this.topid = this.oH1.getAttribute("id");
		}else{
			this.topid = "_genid_h1";
			this.oH1.setAttribute("id",this.topid);
		}
	}
	this.nkeylink[0] = this.topid;
	if(! document.body) document.body = document.getElementsByTagName('body')[0];
	this.dbase = document.documentElement || document.body;
	this.isHome = document.getElementById("mytopimg");
	//var hr =  document.getElementsByTagName("hr");
	//if(hr.length) this.oSepHr = hr.item(hr.length -1);
	//this.prv = (! document.getElementById("snavi"));
	//this.localhost = this.prv ? "192" : "kanzaki";
	//alert(location.host + ", " + location.host.indexOf("192.168"));
	this.localhost = (location.host.indexOf("kanzaki.com") >= 0) ? "kanzaki" : (location.host.indexOf("localhost") >= 0 ? "192" : "-1");
	this.cifoot = this.footerelt();
	//2005-04-18
	//if(this.isvalid() == -1) return -1;
	// set true in stinfo() if grddl present
	this.docmeta = false;
	this.stInfo = this.stinfo();
	//this.linkattrs();
	window.document.onkeypress = _procKey;
	return 1;
}

/** Collects link types from head element. */
STDENV.prototype.linkattrs = function(){
	var x,link = document.getElementsByTagName("link");
	var hasmeta, hashome, hassearch;
	// for toc
	this.next = this.prev = "";
	this.hasEversion = false;
	for(var i=0,n=link.length; i<n; i++){
		x = link.item(i);
		switch(x.getAttribute("rel")){
			case 'next':
				this.next = x.getAttribute("href"); break;
			case 'prev':
			case 'previous':
				this.prev = x.getAttribute("href"); break;
			case 'alternate':
				if(x.getAttribute("hreflang") == 'en') this.hasEversion = true;
				break;
			case 'transformation':
				this.grddltrans = x.getAttribute("href");
				hasmeta = x.getAttribute("href"); break;
			case 'home':
				hashome = true; break;
			case 'search':
				hassearch = true; break;
			case 'meta':
				if(! x.getAttribute("type")) hasmeta = 'meta';
				break;
		}
		//if(x.getAttribute("rev") == 'made'){
		//	this.creator.email = x.getAttribute("href");
			//this.creator.email = this.creator.email.replace(/\.com$/,this.creator.mailTld);
			//x.setAttribute("href",this.creator.email);
		//	x.setAttribute("href","/info/disclaimer#webmastermail");
		//}
	}
	//test to add some useful links
	//if(! hasmeta) 
	//	this.addlinkelt('meta','/meta'+location.pathname,'RDF metadata of this page');
	if(! hashome && location.pathname != '/') this.addlinkelt('home','/');
	if(! hassearch) this.addlinkelt('search','/info/navi#search-site');
	this.addlinkelt('author','/info/who');
}

/**
 * Add link element with specified type and ref.
 */
STDENV.prototype.addlinkelt = function(linktype, ref, title){
	var meta = document.createElement('link');
	meta.setAttribute('rel',linktype);
	meta.setAttribute('href',ref);
	if(title) meta.setAttribute('title',title);
	this.head.appendChild(meta);
}

/**
 * Processes address element.-->footer element
 * - expand signature (M.K.) to long name for print.
 * - set old (commented) original URI as an element.
 * - add QR code.
 * @return	a DOM object of the contentinfo element
 */
STDENV.prototype.footerelt = function(){
	var ouri;
	//id cif0はaddress→div→footer要素と変更
	var footer = document.getElementById("cif0");
	if(! footer){
		var footerl = document.getElementsByTagName("footer");
		if(footerl.length){
			footer = footerl.item(footerl.length - 1);
		}
	}
	if(footer){
		footer.innerHTML = footer.innerHTML.replace(/M\.?K\.?<\/a>(\.?)/i,"M<span class='cpr'>. </span>K<span class='cpr'>anzaki</span></a>$1");
		if((ouri = document.getElementById("orguri"))) this.orguri = this.nodeText(ouri);
		//ouri.firstChild.data;
		footer.innerHTML = 
		"<span id='qrcode'><span class='pseudobutton' title='will get a QR code for title and URL of this page' onclick='ge.qrcode(0);return false;'>get QR code</span></span>" + 
		//or <span class='pseudobutton' title='will get a QR code for title and mobile version URL of this page' onclick='ge.qrcode(1);return false;'>mobile ver.</span>" +
		footer.innerHTML + 
		"<span class='cpr'><br/>For non commercial use only. See http://www.kanzaki.com/info/disclaimer</span>";
		return footer;
	}else
		return '';
}


/**
 * Generates a QR code link, insetead of embed, to avoid unnecessary trafic.
 * @param	mode : 1 => mobile
 */
STDENV.prototype.qrcode = function(mode){
	var qrpos = document.getElementById("qrcode");
	var im = (mode == 1) ? '/i' : '';
	//qrpos.innerHTML = "<img src='http://masaka.dw.land.to/qr/genqr.php?u=http://www.kanzaki.com" + im + location.pathname + "&amp;t=" + String(encodeURI(document.title)).replace(/'/g,"%27") + "' alt='QR Code of this page' />";
	qrpos.innerHTML = "<img src='/lib/qrcode/genq?u="+location.protocol+"//www.kanzaki.com" + im + location.pathname + "&amp;t=" + String(encodeURI(document.title)).replace(/'/g,"%27") + "' alt='QR Code of this page' />";
	qrpos.style.padding = "0";
}

/**
 * Shows update information on page top
 * @return	string status information
 */
STDENV.prototype.stinfo = function(){
	var x, y, z, nsl, c, prof, si="";
	//this.notify('prepating status info...');
	if((y = document.getElementById('pst')))
		si = this.nodeText(y);

	/* navskip link */
	if((nsl = document.getElementById('bnsl')) && (! document.getElementById('s0')) && this.topid)
		nsl.setAttribute('href','#'+this.topid);
	/* status navi info */
	if((x = document.getElementById('snavi'))){
		if(! x.firstChild) return ""; //e.g. iCab
		if(si){x.firstChild.data = si;}
		if((y = document.getElementById('stinfo'))){
			z = this.nodeText(y);
			if((c = document.getElementById('mycounter'))) this.mct(x, c, z);
			else x.setAttribute('title', z);
		}
	}
	/* GRDDL */
	/*
	if((prof = this.head.getAttribute("profile")))
		if(prof.match(/(data-view|metaprof)/)){
			this.grddl(RegExp.$1);
			this.docmeta = true;
		}
	*/
	var validrdfa = document.getElementById('validrdfa');
	if(validrdfa && this.localhost == '192'){
		var uri = String(location);
		validrdfa.setAttribute('href','http://validator.w3.org/check?uri='+uri.replace(/localhost/,"www.kanzaki.com"));
	}

	return si;
}

/** test to add GRDDL icon and link 2004-04-06 */
/*
STDENV.prototype.grddl = function(profile){
	var x, l, uri, hash;
	if(String(location).indexOf('kanzaki.com/memo') != -1) return;
	if((x = document.getElementById('stinfo'))){
		uri = String(location);
		if((hash = uri.indexOf('#',0)) > 0) uri = uri.substr(0,hash);
		//l = (this.docLang == 'ja') ? uri + "%3Futf8" : uri;
		//x.innerHTML += " <a href='http://www.w3.org/2000/06/webdata/xslt?xslfile=http://www.w3.org/2003/11/rdf-in-xhtml-processor&amp;xmlfile=" + l + "'><img src='/parts/grddl.png' alt='GRDDL' /> enhanced</a>.";
		x.innerHTML += " <a id='grddllink' href='http://www.w3.org/2007/08/grddl/?docAddr=" + uri + "&amp;output=" + (this.isIE ? "textxml" : "rdfxml") + "'>GRDDL <img src='/parts/sw-cube-s.gif' alt='as Web of data' /></a>.";
	}
}
*/

/**
 * 'my counter' function: get counter value and set it on the title attribute of navibar. Called from stinfo(), works site top page only.
 * @param	x : destination element to set title attribute
 * @param	c : counter element
 * @param	z : info text to include counter value
 */
STDENV.prototype.mct = function(x, c, z){
	var v = c.getAttribute('title').match(/[\d,]+/);
	z = z.replace("invaluable",v);
	x.setAttribute('title',z);
	if(v.toString().match(/000$/)) x.firstChild.data = ("Wow! " + v);
}



/** add hypelink URLs as printable text after anchor texts for print. */
STDENV.prototype.hrefp = function(){
	if(! this.isIE || this.isIE > 7)return;
	var divlist, main, alist, a;
	this.notify('preparing href print...');
	divlist = document.getElementsByTagName("div");
	for(var i=0,n=divlist.length; i<n; i++){
		if(divlist.item(i).className == 'main'){
			main = divlist.item(i);
			break;
		}
	}
	if(main){
		alist = main.getElementsByTagName("a");
		for(i=0,n=alist.length; i<n; i++){
			a = alist.item(i);
			if(String(a.getAttribute("href")).substr(0,5) == "http:" && (a.getAttribute("href").indexOf(this.localhost) == -1)){
				a.innerHTML = a.innerHTML + "<img src='/parts/netref.gif' class='noprint' alt=''/><span class='hrefprint'> &lt;" + a.getAttribute("href") + "&gt; </span>";
			}
		}
	}
}

/** Makes left-top bg image as Pseudo Fixed Link Banner */
STDENV.prototype.pflb = function(){
	var pf, lb, path, subm, myhome;
	if((path = String(location.pathname)) == '/') return;
	(pf = document.createElement("a")).setAttribute('id','pflb');
	myhome = this.findHome(path);
	pf.setAttribute('href', myhome);
	pf.setAttribute('title', 'To toc page of this group of contents');
	lb = document.createElement("img");
	lb.setAttribute('src', '/parts/tp.gif');
	lb.setAttribute('alt', ' ');
	pf.appendChild(lb);
	this.cifoot.appendChild(pf);
	pf.style.display='block';
	if(this.isMozilla){
		pf.style.position ="fixed";
		if((subm = document.getElementById('smenu1'))) subm.style.position ="fixed";
	}
	this.addlinkelt('up',path.match(/\/$/) ? 
		(myhome == '/works/' ? myhome : '/') : myhome);
}

/** find link destination for pflb(). */
STDENV.prototype.findHome = function(cp){
	if(cp.match(/\/docs\/(html|xml)\//)) return "/docs/htminfo.html";
	if(cp.match(/\/memo\//)) return "/memo/";
	if(cp.match(/\/music\/(mw|perf|cahier|ecrit)/)) return "/music/";
	if(cp.match(/\/(info|test|w3c|art)\//)) return "/";
	if(cp.match(/\/works\/20/)) return "/works/";
	return "./";
}

/** test h2にRDFaの文字があったら言い訳をする。*/
STDENV.prototype.rdfadisclaimer = function(){
	//2013年以降はさすがに分かっているのであえてRDFaと書くときは言い訳不要
	location.pathname.match(/^\/works\/(\d+)\//);
	if(RegExp.$1 && RegExp.$1 > 2012) return;
	var h2 = document.getElementsByTagName('h2');
	for(var i=0,n=h2.length; i<n; i++){
		if(this.nodeText(h2[i]).match(/RDFa/)){
			this.addrdfanote(h2[i]);
			return;
		}
	}
}
//SSLの場合に必要な調整
STDENV.prototype.checkssl = function(){
	if(location.protocol === "https:"){
		var orguri = document.getElementById("orguri");
		if(orguri) orguri.innerText = orguri.innerText.replace(/^http:/, "https:");
	}
}
	
STDENV.prototype.addrdfanote = function(elt){
	var pelt = elt.parentNode;
	var msg = document.createElement('p');
	msg.appendChild(document.createTextNode("※ここで取り上げているのはRDFa 1.0です。RDFa 1.1は1.0とはいくつかの点で互換性がありません。"));
	msg.setAttribute('class', 'note rdfadis');
	pelt.insertBefore(msg, elt.nextSibling);
}


/** shabby test to add some RDFa properties for Operator(Firefox)
 * no namespace decl, and use predefined dc:
 */
/*
	STDENV.prototype.poor_rdfa = function(){
	var t = this.head.getElementsByTagName('title').item(0);
	var m = this.head.getElementsByTagName('meta');
	t.setAttribute("property","dc:title");
	for(var i=0,n=m.length; i<n; i++){
		switch(m[i].getAttribute("name")){
			case 'keyword': m[i].setAttribute("property","dc:subject");break;
			case 'author': m[i].setAttribute("property","dc:creator");break;
			case 'description': m[i].setAttribute("property","dc:description");break;
		}
	}
	// add created/modified
	this.cifoot.innerHTML = this.cifoot.innerHTML.replace(/class="(created|modified)"/g, "property=\"dc:$1\" class=\"$1\"");
}
*/

//-------------------- misc functions --------------------

/** avoid to be included in a frame from outside. */
STDENV.prototype.noframe = function(){
	if(location.pathname.match(/^\/works/)) return;
	if(top.frames.length > 0) top.window.location = self.window.location;
}

/** Makes English summary text (class="esum") visible for non Japanese users */
STDENV.prototype.ecomment = function(){
	if(this.usrLang.match(/ja/i)) document.write("<style type='text/css'>.esum {display:none}<\/style>");
}

/* Notify the process in the UA's status bar. Avoid Mozilla conflicts */
STDENV.prototype.notify = function(str){
	if(this.isMozilla) return;
	status = ((str == '') ? defaultStatus : str);
}

//-------------------- public accessible utilities ----------

/**
 * Replace textual representation of mail box with valid address
 * to avoid mail address collector robots.
 */
STDENV.prototype.mailme = function(id){
	if(! id) id = 'webmastermail';
	var o = document.getElementById(id);
	//var str = o.innerHTML.replace(/ at /,"&#xfeff;@&#xfeff;");
	var str = o.innerHTML.replace(/ at /,"<i class='c'> </i>@<i class='c'> </i>");
	//str = str.replace(/^webmaster/,this.creator.mailAcnt);
	str = str.replace(/ dot /g,".");
	str = str.replace(/ dash /g,"-");
	str = str.replace("thisdo"+"main",this.creator.fn+"<strong>"+this.creator.mailTld+"</strong>");
	o.innerHTML = str;
	o.setAttribute('href','#'+id);
	//o.setAttribute("href","javascript:ge.setmail('"+id+"','mua')");
	o.onmouseover = ge.setmailto;
	o.onfocus = ge.setmailto;
	o.onkeypress = ge.setmailto;
	var s = o.getElementsByTagName('strong');
	if(s.length) s[0].onmouseover = ge.setmailto;
	var ns = document.getElementById(id+'ns');
	if(ns) ns.style.display = "none";
}

STDENV.prototype.setmailto = function(ev){
	var o;
	//mailto: scheme
	var scheme = String.fromCharCode(109,97,105)+String.fromCharCode(108,116,111,58);
	if(window.event) o = event.srcElement
	else if(ev) o = ev.target;
	if(o.nodeType == 3) o = o.parentNode;
	if(o.nodeName == 'strong') o = o.parentNode;
	//set href attribute to mailto: + element content minus tags.
	if(o && o.nodeName == 'a' && o.getAttribute('href').substr(0,7) != scheme){
		//o.innerHTML = o.innerHTML.replace(/\ufeff/g,"");
		o.innerHTML = o.innerHTML.replace(/<i.*?> <\/i>/gi,"");
		o.setAttribute('href',scheme+o.innerHTML.replace(/<.*?>/g,''));
	}
}


/** 
 * Set stylesheet element via script
 * @param	styles : style declarations.
 * @access	public
 */
STDENV.prototype.setstyle = function(styles){
	if(document.createStyleSheet) {
		document.createStyleSheet("javascript:'"+styles+"'");
	}else{
		var ss = document.createElement('link');
		ss.rel = 'stylesheet';
		ss.href = 'data:text/css,'+escape(styles);
		document.documentElement.childNodes[0].appendChild(ss);
	}
}

/** Emulates CSS max-width for UAs that do not support the property */
STDENV.prototype.maxwidth = function(){
	var asb = document.getElementById('aux-sidebar');
	// x = body width, dWidth = width of widest element + padding etc.
	if((x = document.body.clientWidth) > ge.mw.check){
		var dWidth = document.documentElement.clientWidth;
		document.body.style.paddingRight=(document.body.clientWidth - ge.mw.set) + 'px';
		//alert('2: '+x + ',' + dWidth);
		//check to avoid trouble if some elements (e.g. form field) have fixed width
		if(dWidth > 0 && document.body.clientWidth > dWidth){
			//ge.noAdjustWidth = true;
			//window.onresize = '';
			return;
		}
		/*if(ad){
			if(ge.mw.showad && x > ge.mw.ad) ad.style.display = 'block'
			else ad.style.display = 'none';
		}*/
	}else{
		document.body.style.paddingRight = "3em";
		if(asb) asb.style.display = 'none';
	}
}

/** 
 * Get text from child nodes in DOM.
 * @param	m : target node.
 * @return	text in the node m.
 * @access	public
 */
STDENV.prototype.nodeText = function(m){
	if(typeof(m) != 'object') return m;
	var res='';
	for(var i=0,n=m.childNodes;i<n.length;i++){
		if(n.item(i).nodeType == 3) res += n.item(i).data;
		else if(n.item(i).nodeType == 1) res += this.nodeText(n.item(i));
	}
	res = res.replace(/^\s*/,"");
	return res.replace(/\s*$/,"");
}

/** 
 * Convert 2 digit hex to dicimal number
 * @param	h : 2 digit hex string
 * @return	decimal number
 * @access	public
 */
STDENV.prototype.h2d = function(h){
	return ("0123456789abcdef".indexOf(h.charAt(1),0) + "0123456789abcdef".indexOf(h.charAt(0),0) * 16);
}

STDENV.prototype.about = function(o,type){
	if(o == 'all'){
		var res = '';
		for(var obj in window){
			if(obj == 'top') break;
			try{
			if(window[obj].prototype && window[obj].prototype.meta)
				res += _get_meta(window[obj].prototype.meta,'vt') + "\n";
			}catch(e){
				break;
			}
		}
		return res;
	}else{
		var meta = o ? (o.meta ? o.meta : o.prototype.meta) : this.meta;
		return _get_meta(meta,type) + "\n" + _get_doc_meta();
	}
	
	function _get_meta(meta,type){
		return type == 'v' ?
		"ver " + meta.release.revision + ", " + meta.release.created :
		(type == 'vt' ? meta.title + " (ver " + meta.release.revision + ", " + meta.release.created + ")" :
		meta.title + "\noriginal: "+meta.created + "\nmodified: " + meta.release.created + " (ver " + meta.release.revision + ")" );
	}
	
	function _get_doc_meta(){
		return "MIME type: " + document.contentType + "\ncharset: " + document.characterSet + "\nmodified: " + document.lastModified;
	}

};



//-------------------- popup TOC test 2003-10-13 --------------------

/** preparation of popup TOC on init() */
STDENV.prototype.preptoc = function(){
	var lis;
	if(this.isMacIE) return;// || this.isIcab
	this.notify('preparing pop toc ...');
	if((lis = this.prepHdngs(document.getElementsByTagName('h2'),
		this.getTocList("ul"))))
			this.genTocDiv(lis);
}

/** check if the page has elements to be used as TOC */
STDENV.prototype.getTocList = function(tagName){
	var toc, tocl = document.getElementsByTagName(tagName);
	for(var i=0, n=tocl.length; i<n; i++){
		if(tocl.item(i).className == "toc") {toc = tocl.item(i); break;}
	}
	return toc;
}

/** show icon at each heading, and returns TOC object */
STDENV.prototype.prepHdngs = function(hd, pageToc){
	var x, xid, lis, n;
	var numH2 = hd.length;
	if(pageToc){
		for(var i = ge.isHome ? 3 : 0; i<numH2; i++){
			x = hd.item(i);
			xid = x.getAttribute("id") ? x.getAttribute("id") :
				(x.firstChild.getAttribute ?
					x.firstChild.getAttribute("id") : '');
			if(! xid) x.setAttribute("id",(xid = "_genid_"+i));
			this.prepHd(x, xid ,i, this.ptocImg, this.ptocMsg);
		}
		hd = document.getElementsByTagName('h3');
		for(i=0, n=hd.length; i<n; i++){
			x = hd.item(i);
			if(x.getAttribute("id") || x.firstChild.nodeName=="a")
				x.innerHTML += this.ptocImg;
		}
		lis = pageToc.innerHTML;
		
		
	}else if(numH2 > 1){
		//if no TOC list and more than 2 <h2> present
		lis = this.genPseudoToc(hd, this.ptocImg, this.ptocMsg);
	}else if(numH2 == 0 && (hd = document.getElementsByTagName('dt')).length > 2){
		//if no h2 and more than 3 dt
		lis = this.genPseudoToc(hd, this.ptocImg, this.ptocMsg);
	}
	return lis;
}

/** generate TOC from specified elements */
STDENV.prototype.genPseudoToc = function(hd, ptocImg, ptocMsg){
	var x, xid, lis = "";
	for(var i=0, n=hd.length; i<n; i++){
		x = hd.item(i);
		if(x.firstChild.getAttribute && x.firstChild.getAttribute("id"))
			xid = x.firstChild.getAttribute("id");
		else if(x.getAttribute("id"))
			xid = x.getAttribute("id");
		else
			x.setAttribute("id",(xid = "_genid_"+i));
		lis += "<li><a href='#" + xid + "'>" + this.nodeText(x) + "</a></li>";
		this.prepHd(x, xid, i, ptocImg, ptocMsg);
	}
	return lis;
}

//-- set up each TOC item ----------

STDENV.prototype.prepHd = function(heading, xid, i, ptocImg, ptocMsg){
	heading.innerHTML += ptocImg;
	//heading.innerHTML = (i+1)+". "+heading.innerHTML+ptocImg;
	//heading.setAttribute("title",ptocMsg);
	if(xid) this.nkeylink[i+1] = xid;
}

/** generate the popup TOC division */
STDENV.prototype.genTocDiv = function(lis){
	(this.toc = document.createElement("nav")).setAttribute("id","poptoc");
	this.toc.setAttribute("role","navigation");
	this.toc.appendChild(document.createTextNode(" "));
	this.toc.innerHTML = this.oH1 ?
		"<h2><a href='#" + this.topid + "'>"
		+ this.oH1.innerHTML.replace(/<img.*alt=\"([^\"]+)\"[^>]*>/i,"$1") + "</a><span class='c'> [TOC]</span></h2>" :
		"<h2><a href='#'>Page Top</a><span class='c'> [TOC]</span></h2>";
	this.toc.innerHTML += "<ol>" + lis.replace(/href/g,"tabindex='1' href") + "</ol>"
		+ this.getNaviLink() + "<div class='nav'><a tabindex='1' href='/'>Home page</a> - "
		+ "<a tabindex='1' href='/info/navi'>Help &amp; search</a></div>";
	//"
	//innerHTMLの操作を先にしないとfooterに加えたthis.tocが無効になる
	this.cifoot.innerHTML = "<img src='/parts/ptoc.gif' class='tocpic' style='float:right'/>" + this.cifoot.innerHTML;
	if(typeof(gs) == "object"){
		//XHTMLスライドの場合はfooterをdisplay:noneにしてしまうので、その外に置く
		document.body.appendChild(this.toc);
	}else{
		//でなければ構造をきれいにするためにfooterの中に置く
		this.cifoot.appendChild(this.toc);
	}
	window.document.onclick = this.popToc;
	this.calcObj(this.toc, 300);
	// TOC at the bottom "
}

/** if the page has prev/next link(s)... */
STDENV.prototype.getNaviLink = function(){
	var navi="";
	if(this.prev)
		navi = "&lt;&lt; <a href='" + this.prev + "'>Prev page</a> ";
	if(this.next){
		if(this.prev) navi += "| ";
		navi += "<a href='" + this.next + "'>Next page</a> &gt;&gt;";
	}
	return (navi ?  "<p>" + navi + "</p>" : "");
}

/** determin the size of popup TOC */
STDENV.prototype.calcObj = function(o, maxw){
	this.notify('prepating toc size ...'); // test
	var orgX = self.pageXOffset;
	var orgY = self.pageYOffset;
	o.style.visibility = "hidden";
	o.style.display = "block";
	o.width = o.offsetWidth;
	if(o.width > maxw){
		o.width = maxw;
		if(!this.isSafari) o.style.width = maxw + "px"; //@@ Safari xhtml+xml
	}
	o.height = o.offsetHeight;
	o.style.display = "none";
	o.style.visibility = "visible";
	if(orgY) scroll(orgX,orgY);
}

//-- click event handlers ----
/** Show/hide TOC on click event according to its location */
STDENV.prototype.popToc = function(ev){
	var tg,tgn;
	if(window.event){
		ev = event; tg = ev.srcElement;
	}else if(ev){
		tg = ev.target;
	}

	if(ev.altKey) _dispToc(ev,tg,0);
	//added 'snum' for slide
	else if(tg.className=='tocpic' || tg.className=='snum') _dispToc(ev,tg,2);
	//else if(ev.shiftKey) this.procSC(ev,tg);
	else{
		/*if(tg.nodeName.substr(0,2).match(/(a|h[2-4])/)){
			tg = tg.parentNode; //Mozilla 1.2.1
			if(! tg.nodeName.substr(0,2).match(/(a|h[2-4])/)){
				_hideToc(); return;
			}
		}
		if(tg.getAttribute){
			if(tg.getAttribute("href")) _hideToc();
			else if(tg.getAttribute("id")) _dispToc(ev,tg,1);
			else _hideToc();
		}else */
		_hideToc();
		
		
		var dv = document.defaultView;
		var x = tg, mp="";
		/*
		while(1){
			//mp += x.nodeName + '('+ x.className + '), margin:'+x.currentStyle.margin + ',padding:'+x.currentStyle.padding + ', width:'+x.currentStyle.width + "\n";
			mp += x.nodeName + '('+ x.className + '), margin:'+dv.getComputedStyle(x,null).getPropertyValue('margin-left') + ','+dv.getComputedStyle(x,null).getPropertyValue('margin-right') +',padding:'+dv.getComputedStyle(x,null).getPropertyValue('padding-left')  + ','+dv.getComputedStyle(x,null).getPropertyValue('padding-right') + ', width:'+dv.getComputedStyle(x,null).getPropertyValue('width') + "\n";
			if(x.nodeName == 'html') break;
			x = x.parentNode;
		}
		alert(mp);
		*/
	}
}

/* for debug 
STDENV.prototype.procSC = function(ev,tg){
	//if(ge.prv && (tg.parentNode.getAttribute("id") == ge.topid || tg.getAttribute("id") == ge.topid)){
		//alert(ge.toSource());
	//}
	alert("e.y:"+ev.y+", body.clientHeight:"+document.body.clientHeight+", docEl.clientHeight:"+document.documentElement.clientHeight );
}
*/

/** find current heading (event target) and hilite it in TOC */
STDENV.prototype.setCurPos = function(tg,type){
	var tid = (type==1) ? tg.getAttribute("id") :
		(tg.parentNode.getAttribute("id") ? tg.parentNode.getAttribute("id") :
			(tg.parentNode.firstChild.getAttribute ? tg.parentNode.firstChild.getAttribute("id") :''));
		//(tg.parentNode ? tg.parentNode.firstChild.getAttribute("id") : '#');
	if(tid) _hiliteHd(tid);
}




/** warning for copy */
STDENV.prototype.isvalid = function(){
	var navi, adr, status, sideimg, notice;
	if(this.localhost != "-1") return 1;
	notice = "For archive/cache only. This copy may not be the latest version of this content.";
	status = 'a copy of ';
	if((navi = document.getElementById("banner"))){
		navi.innerHTML += "<p class='note' style='font-weight:normal; font-size:100%'>" + notice + "</p>";
	}
	
	adr = document.getElementsByTagName("address").item(0);
	adr.innerHTML = adr.innerHTML.replace(/This is/,'This is <strong class="hot">' + status + '</strong> ');
	
	return -1;
}

/** Generates hcard info for experiment.
 * Document.write here in order to be recognized by plugins
 * that parses data before onload() event. */
STDENV.prototype.genvc = function (){
	var st='', et='';
	if(this.creator.email){
		st = "<a href='" + ge.creator.email + "' class='email'>";
		et = "</a>";
	}
	document.write(" by <span class='vcard'>"+st+"<span class='fn'>"+this.creator.name+"</span>"+et+", <span class='title'>a bassist</span>, <span class='adr'><span class='region'>Tokyo</span>,<span class='country-name'>Japan</span><a href='/' class='url'><img class='photo' src='/info/masakabas-s.gif' alt='' /></a></span></span>");
}


}
//-- - end of STDENV object -




// separated from STDENV due to some problems ...

/** display on mouseclick */
function _dispToc(ev,tg,type){
	var doc = _eventDocPos(ev);
	var scr = _eventScrPos(ev);
	//scrollable menu
	var h = ge.toc.height;
	var w = ge.toc.width;
	if(scr.h < ge.toc.height){
		ge.toc.style.height = scr.h + "px";
		ge.toc.style.overflow = "auto";
		ge.toc.style.top = (doc.y - scr.y) + "px";
	}else{
		if(!ge.isSafari) ge.toc.style.height = h + "px"; //@@ Safari xhtml+xml
		ge.toc.style.top = ((scr.h - scr.y > h) ? doc.y + "px" :
			((scr.y > h) ? (doc.y - h) + "px" :
				((scr.y < scr.h/2) ? (doc.y - scr.y) + "px" :
					(doc.y + scr.h - scr.y - h) + "px")));
	}
	ge.toc.style.left = ((scr.x < scr.w - w) ? doc.x + "px" :
		(doc.x - w) + "px");
	if(type) ge.setCurPos(tg,type);
	ge.toc.style.display = "block";
}

/** display on kbd request */
function _dispTocKey(ev){
	ge.toc.style.top = ((document.body.scrollTop + document.documentElement.scrollTop) || self.pageYOffset) + "px";
	// gToc.style.top = (ge.dbase.scrollTop | self.pageYOffset) + "px"; 
	ge.toc.style.left = 0;
	ge.toc.style.display = "block";
}

/** hilite current heading */
function _hiliteHd(tid){
	var pat = "#" + tid + "\"";
	var rep = pat + " class=\"here\"";
	ge.toc.innerHTML = ge.toc.innerHTML.replace(pat,rep);
}

/** close TOC and clear hilite */
function _hideToc(){
	ge.toc.style.display = "none"
	ge.toc.innerHTML = ge.toc.innerHTML.replace(/ class=\"?here\"?/,"");
}
//"
/** keyboard event handler */
function _procKey(e){
	var key, kl, tg;
	if(e){
		key = e.which; tg = e.target;
	}else{
		key = event.keyCode; tg = event.srcElement;
	}
	//if(key == 35){ aler("testing");treturn; }//End key
	if(tg.nodeName.match(/(input|textarea)/i)) return true;
	kl = String.fromCharCode(key).toLowerCase();
	if(kl == '?'){
		if(location.href.indexOf("/info/navi") == -1){
			if(confirm("Go to help/search page ?"))
				location.href= "/info/navi";
		}else
			alert("This key should bring you our help, i.e. this page :-)");
		return false;
	}else if(ge.toc && ge.toc.style){
		if(ge.toc.style.display == 'block'){
			if(key == 27 || key == 47) _hideToc(); //Esc, slash
			else if(key >= 48 && key <=57){ //0-9
				key -= 48;
				if(ge.nkeylink[key]){
					location.href = "#" + ge.nkeylink[key];
					_hideToc();
				}
			}
		}else{
			if(key == 47) _dispTocKey();
		}
	}
	return true;
}


/**
 * Get event coordinates relative to current document
 * @access : public
 * @param	e : event
 * @return	the coordinates as Object
 */
function _eventDocPos(e){
	var p = {};
	/*if(ge.isOpera){
		p.x = e.clientX + document.body.scrollLeft;
		p.y = e.clientY + document.body.scrollTop;
	}else */
	if(ge.isIE){
		if(ge.isIE < 8){// if(e.x){
			p.x = e.x + document.body.scrollLeft + document.documentElement.scrollLeft;
			p.y = e.y + document.body.scrollTop + document.documentElement.scrollTop;
		}else{
			p.x = e.x;
			p.y = e.y;
		}
	}else{
		p.x = e.pageX;
		p.y = e.pageY;
	}
	return p;
}

/**
 * Get event coordinates relative to the screen
 * @access : public
 * @param	e : event
 * @return	the coordinates as Object
 */
function _eventScrPos(e){
	var p = {};
	/*if(ge.isOpera){
		p.x = e.clientX;
		p.y = e.clientY;
		p.w = document.body.clientWidth;
		p.h = document.body.clientHeight;
	}else */
	if(ge.isIE){//if(e.x)
		p.x = e.x;
		p.y = e.y;
		p.w = document.body.clientWidth;
		p.h = document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight;
		//p.w = ge.dbase.clientWidth;
		//p.h = ge.dbase.clientHeight;
	/*}else if(ge.isSafari){
		p.x = e.screenX;
		p.y = self.innerHeight - self.screenY - e.screenY;
		//Safari doesn't seem to have location relative to current window. Tricky but Safari's screenY counts form the bottom of the screen (or window)
		p.w = self.innerWidth;
		p.h = self.innerHeight;*/
	}else{
		p.x = e.clientX;
		p.y = e.clientY;
		p.w = self.innerWidth;
		p.h = self.innerHeight;
	}
	return p;
}

/**
 * Quick dirty XPath implementation for XHTML document
 * @access : public
 * @param	expr : xpath expression
 * @param	context : start node for the xpath
 * @return	node list (depends on resultType)
 */
STDENV.prototype.xhp = function(expr, context) {
	context = context || document;
	var xpath = expr.replace(/([\.\/]+)?([\w\d]+)(\[[^\]]+\])?(\[[^\]]+\])?/g, "$1x:$2$3$4");
	var resolver = function(prefix){return document.documentElement.namespaceURI; };
	var res = document.evaluate(xpath, context, resolver, XPathResult.ANY_TYPE, null);
	switch(res.resultType){
	case 1: return res.numberValue;
	case 2: return res.stringValue;
	case 3: return res.booleanValue;
	case 4: 
	case 5:
		res = document.evaluate(xpath, context, resolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		var nodes  = [];
		var length = res.snapshotLength;
		for (var i = 0; i < length; i++)
			nodes.push(res.snapshotItem(i));
		return nodes;

		//var a=[];
		//while(e=res.iterateNext()){a.push(e);};
		//return a;
	default: return res;
	}
}
	


//moved to std-void-parts
function maxwindowad(){

}

//HTML5 for IE 暫定
(function(){
	var dummy, elts = ['header','footer','nav','section'];
	for(var i=0; i<elts.length; i++){
		dummy = document.createElement(elts[i]);
	}
})();
