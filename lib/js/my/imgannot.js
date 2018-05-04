/// imgannot.js by KANZAKI, Masahide. ver 3.9, 2018-05-01. MIT license.
"use strict";
var at, Mav = {}, Mavannot, Mau, Mwa;
var OpenSeadragon, anno;

var Mia = {
	const: {
		noimage: "/works/2016/pub/images/noimage.png",
		libpath: "/lib/js/my/",
		threejs_path: "/lib/js/3d/",
		pdf_path: "/lib/js/pdf/",
		osd_imgpath: "/lib/js/osd/images/",
		refstr_pclass: "refstrp",
		refstr_bg: "#ca9",
		refstr_size_ratio: 0.1,
		refstr_width: 89,
		seqbtn: {"previousButton": "l-arrow.png", "nextButton": "r-arrow.png"},
		thumb_width: 150,
		nvzoom: [1.67, 1.33],
		tindex_offset: 5,
		narrow_scr_tioffset: 3,
		narrow_scr_width: 900,
		mobile_scr_width: 750,
		threed_formats: ["application/vnd.threejs+json", "application/ply", "model/gltf+json", "text/plain"]
	},
	optv: {
		showReferenceStrip: true,
		foc: true,
		fit: true,
		hop: 0.6,
		ti_void: "^\\s*-\\s*$",
	},
	eltmap: {
		osdv: "openseadragon",
		maindiv: "main"
	},
	elt : {},
	env : {
		keyuri: null,
		dim: {"x":null, "y":null},
		rtl: false,
		numTiles: 0,
		numPages: 0,
		user: {"id": "urn:who.are#you", "numanno": 0},
		anno: null,
		tpos: null,
		type: null,
		lang: null,
		flick_threshold: 2500,
		narrow_scr: false,
		syncpage: null,
		center: null,
		loaded_uri: null,
		is_local: null,
		is_touch_dev: (typeof window.ontouchstart) !== "undefined"
	},
	cinfo: {},
	keyuris: [],
	ent: {
		label: null,
		description: null,
		logo: null
	},
	jsource: {},
	jsourcem: [],
	oa: {},
	defer: {
		paint: {},
		highlight: {}
	},
	
	
	setup: function (url, data, moreurl){
		this.prepare_env("loading JSON");
		if(url === undefined && data === undefined) url = this.opts.v.u;
		else if(!this.opts.v.u) this.opts.v.u = url;
		if(url){
			if(url.match(/^urn:curation:(\d)$/)) Miiif.proc_parent_json(RegExp.$1);
			else load(url);
		}else{
			Mpj.proc_json(data, "");
		}
		function load(url, is_retry = false){
			OpenSeadragon.makeAjaxRequest({
				"url": url,
				"success": function(xhr) {
					Mpj.proc_json(xhr.response, data, moreurl);
				},
				"error": function(e){
					if(e.status === 0 && !is_retry && Mia.env.proxy){
						Mia.opts.v.u = Mia.env.proxy + url;
						Mia.opts.base = Mut.uri.resolve(Mia.opts.v.u, location.href);
						console.warn("retry with proxy");
						load(Mia.opts.v.u, true);
					}else{
						Muib.state.is_error = true;
						Muib.appb.set_status("auto");
						var msg = (e.status===0 && !e.statusText) ? "(Undefined error. See console for detail)" :
							"with status "+ e.status + ":" + e.statusText;
						Muib.appb.set_msg("JSON file load error " + msg, "error");
						console.error(e);
					}
				}
			});
		}
	
	},
	set_job: function(res){
		switch(res.type){
		case "curation":
		case "collection":
			break;
		case "video":
		case "audio":
		case "sound":
		case "simple":
			this.proc_media(res.info.url, res.tile, res.anno, res.type);
			break;
		case "threed":
			if(res.tile.length){
				this.init(res.tile, res.anno);
			}else{
				Muib.threed.proc_single3d(res);
			}
			break;
		case "pdf":
			Muib.pdf.load(res.info.url, res.anno);
			break;
		case "image":
		default:
			if(res.tile.length) this.init(res.tile, res.anno);
			else unsupported(res);
		}
		if(Mia.env.is_local && Muib.local) Muib.local.job(res);
		
		function unsupported(res){
			var msg;
			if(res.info.error_reported){
				msg = res.info.error;
				console.error("so, no tile to process.", res);
			}else{
				msg = res.info.error || Mpj.test_support() || "No image specified";
				console.error("No tile to process. reason:", msg, res);
			}
			Muib.appb.set_msg(msg, "error");
			Muib.appb.set_h1(false);
			Muib.meta.add(Mia.jsource);
		}
	},

	init: function (tile, oa, extinfo, type){
		this.prepare_env("preparing viewer");
		if(!type) type = "image";
		this.env.type = type;
		this.osdtype = tile.length ? "image" : type;
		Muib.appb.set_msg("initial setup ...");
		if(extinfo) this.setup_extinfo(extinfo);
		Muib.appb.set_h1();
		Muib.appb.set_status("wait");
		Mia.env.numTiles = tile.length;
		this.osdv = new OSDV(this);
		if((tile.length === 0 || Miiif.num_video || type==="audio") && !this.opts.v.mz){
			this.osdv.init_viewer(this.media_pseudo_osd(tile, type));
		}else{ 
			this.osdv.init_viewer(this.prep_osd(tile, type));
		}
		Mwa.setup(this.osdv, (
			Miiif.cview.noannot ? {"nobutton": true} :
			{"h": Muib.jldpanel.showbtn, "hparam": "selector"}
		));
		Muib.appb.set_msg("loading image ...");
		this.oa = oa;
		this.osdv.set_osd_handlers();
		if(!Miiif.cview.noannot) this.set_annotroious_handlers();
		this.post_osd();
		this.layers.viewer = this.osdv.viewer;
		if(type === "image"){
			if(this.filter && this.filter.ctrlbtn) this.filter.makesure_partof_dom();
			else this.filter = new Filter(this);
		}
		
	},
	prep_osd: function (tile, type){
		var osdoption = {
			id: this.eltmap.osdv,
			tileSources: tile,
			prefixUrl: this.const.osd_imgpath,
			showZoomControl: false,
			showHomeControl: false,
			showRotationControl: true,
			minZoomImageRatio: 0.2,
			maxZoomPixelRatio: this.opts.v.mz || 3.0,
			controlsFadeDelay: 1000,
			controlsFadeLength: 700,
			showNavigator: true
		};
		this.env.numPages = Miiif.cview.layer ? this.keyuris.length : this.env.numTiles;
		
		if(this.env.numTiles > 1 || this.struct.data.length > 0 || 
			(Miiif.cview.layer && Miiif.vinfo.dir[1] !== "top-to-bottom")
		){
			osdoption.sequenceMode = true;
			osdoption.showReferenceStrip = true;
			osdoption.referenceStripSizeRatio = this.const.refstr_size_ratio;
			osdoption.mkReferenceStripPanelWidth = this.const.refstr_width;
			this.pre_osd_multi(osdoption);
		}else{
		}
		this.tindex.prepare(this.osdv, (tile instanceof Array) && !Miiif.cview.layer);
		this.pre_osd(osdoption, type);
		return osdoption;
	},
	media_pseudo_osd: function(tile, type){
		if(this.ent.extinfo) Muib.meta.add({});
		
		var osdopt = {
			id : Mia.eltmap.osdv,
			prefixUrl : Mia.const.osd_imgpath,
			showHomeControl : false,
			showRotationControl : false,
			showFullPageControl: false,
			showZoomControl: false,
			showSequenceControl: false,
			panHorizontal: 	false,
			panVertical: 	false,
			gestureSettingsMouse: {scrollToZoom: false, clickToZoom: false},
			visibilityRatio: 	1,
			showNavigator : false
		};
		if(Mia.env.numTiles) osdopt.tileSources = tile;
		if(Miiif.cvs.num > 1) osdopt.sequenceMode = true;
		this.tindex.prepare(this.osdv, this.struct.data.length);
		this.tindex.single_canvas.skip = true;
		if(this.opts.fit === false){
		}else if(Miiif.locfmedia || this.env.numTiles){
			this.osdv.reset_size(this.cinfo[this.keyuris[0]].dim);
		}else if(type === "audio"){
			this.osdv.reset_size(Mau.opts.dim);
		}
		return osdopt;
	},
	pre_osd_multi: function(osdop){
		var stpos = this.opts.check_start_pos();
		this.env.syncpage = stpos > 0 ? stpos : 0;
		this.opts.iniOsdPos = osdop["initialPage"] = this.get_pos(this.env.syncpage);
	},
	pre_osd: function(osdop, type){
		var ov = this.opts.v,
		that = this;
		if(ov.osd) for(var p in ov.osd) osdop[p] = ov.osd[p];
		if(ov.z && ov.z.match(/^\d+(\.\d+)?$/)) osdop.defaultZoomLevel = ov.z;
		if(type !== "image") Mav.vinfo.dim = {x: this.elt.osdv.clientWidth, y: this.elt.osdv.clientHeight};
		
		if(osdop.sequenceMode && this.const.seqbtn.nextButton){
			this.elt.seqbtns = {};
			Object.keys(this.const.seqbtn).forEach(function(btnid){
				var fname = this.const.seqbtn[btnid],
				id = fname.replace(/\.\w+$/, ""),
				btn = Mut.dom.elt("img", "", [
					["src", Mia.const.osd_imgpath + fname],
					["id", id]
				]);
				this.elt.seqbtns[btnid] = btn;
				this.osdv.elt.appendChild(btn);
				osdop[btnid] = id;
				this.osdv.seqbtn_grp.push(Mut.dom.elt("div"));
			}, this);
		}
	},
	post_osd: function(){
		var ov = this.opts.v;
		this.elt.osdcanvas = this.elt.osdv.getElementsByTagName("canvas")[0];
		this.refstrip = new Refstrip(this);
		if(typeof(ov.style) !== "undefined") this.opts.set_style(ov.style, true);
		else if(ov.wm && (ov.wm === "v" || ov.wm === "vertical"))
		this.opts.set_style("show-vertical", true);
		if(this.opts.dual) window.parent.show_gofar(ov.inf, this.env.numTiles, ov.z, ov.fb);
		else if(ov.clip === "all") Muib.clip.allimg.checked = true;
		
		var stylepos = ["left", "right"],
		toppos = Math.abs(this.osdv.elt.clientHeight / 2 - 80) + "px";
		if(this.elt.seqbtns) Object.keys(this.elt.seqbtns).forEach(function(key, i){
			var btngrpelt = this.osdv.seqbtn_grp[i],
			seqbtngrp = new OpenSeadragon.ButtonGroup({
				buttons: [this.osdv.viewer[key]],
				element: btngrpelt
			});
			this.osdv.viewer.addControl(seqbtngrp.element, {anchor: OpenSeadragon.ControlAnchor.ABSOLUTE});
			var pnode = btngrpelt.parentNode;
			pnode.style[stylepos[i]] = "10px";
			pnode.style.top = toppos;
			pnode.className = "seqbtngrp";
			
			if(this.env.numTiles === 1){
				var that = this;
				this.osdv.viewer[key].addHandler("click", function(){that.osdv.go_seq(key);}); 
				this.osdv.viewer[key].enable();
			}
		}, this);
	},
	setup_extinfo: function(info){
		if(info.base) this.ent = info.base;
		if(info.page){
			this.cinfo = info.page;
			Mia.keyuris = Object.keys(info.page);
		}else{
			this.cinfo[this.opts.v.u] = {};
			Mia.keyuris = [this.opts.v.u];
		}
		if(info.msg){
			Mia.elt.imgdsc.innerHTML = info.msg;
		}
		if(this.opts.v.label){
			Mia.ent.label = this.opts.v.label;
		}
		this.ent.extinfo = true;
	},
	prepare_env: function(msg){
		if(this.elt.osdv) return;
		this.opts.init();
		var lang = navigator.userLanguage || navigator.language;
		this.env.lang = Mut.str.preflang = lang.substr(0,2).toLowerCase();
		Muib.state.uribase = this.opts.v.u ? (this.opts.v.u.match(/^https?:/) ?
		this.opts.v.u.split('/').slice(0,-1).join('/') + '/' : "") : "";
		if(this.env.is_touch_dev) this.env.flick_threshold = 1000;
		this.env.is_local = (location.hostname === "localhost");
		this.env.proxy = this.env.is_local ? "cors_proxy/": "";
		if(typeof(Mwa) === "undefined") try{
			Mwa = new WebAnnotorious();
		}catch(e){
			console.error(e);
			Muib.appb.set_msg(e.message, "Seems using 'old cache' of webannotorious.js. Please try to full reload");
		}
		
		this.elt.osdv = Mut.dom.get(Mia.eltmap.osdv, "id");
		this.elt.maindiv = Mut.dom.get(Mia.eltmap.maindiv, "id") || this.elt.osdv.parentNode;
		this.elt.msg = Mut.dom.elt("p", "", [["class", "msg"]]);
		Mut.dom.append(this.elt.osdv, this.elt.msg);
		Muib.appb.set_msg(msg, "loading"); // + " ..."
		this.elt.jldarea = Mut.dom.elt("textarea", "", [["id", "jld"]]);
		Mut.dom.append(this.elt.osdv, this.elt.jldarea);
		this.elt.jldb = Mut.dom.elt("button", "Show" + Muib.jldpanel.btnlabel, [["id", "showjld"]]);
		this.elt.jldb.onclick = function(){Muib.jldpanel.toggle(this);};
		var jldctrl = Mut.dom.elt("div");
		Mut.dom.append(jldctrl, this.elt.jldb);
		this.elt.imgdsc = Mut.dom.elt("div", "", [["id", "imgdsc"], ["class", "metainfo"]]);
		Mut.dom.append(this.elt.maindiv, this.elt.imgdsc);
		Mut.dom.append(this.elt.maindiv, jldctrl);
		Mut.dom.append(this.elt.maindiv, Mut.dom.elt("div","",[["id", "annoclip"]]));
		Muib.annobox.init_elt(jldctrl);
		Muib.clip.init_elt(jldctrl);
		this.elt.jldctrl = jldctrl;
		this.tindex = new Tindex(this);
		this.struct = new Struct(this);
		this.layers = new Layers(this);
		this.gallery = new Gallery(this);
	},
	opts: {
		v: {
			u: null,
			page: null,
			label: null,
			inf: false,
			raw: false,
			dir: null,
			vhint: null,
			othpat: null,
			mode: null
		}, 
		iniOsdPos: 0,	//OSDの最初の画像位置。osdop["initialPage"]に相当
		osdbr: null,	//OSDブランチ。mk改訂版を使っているときに"mk"をセットする
		base: null,
		dual: false,
		antparam: {"boxpfx": ".annotorious-ol-boxmarker-", "popup": ".annotorious-popup"},
		init: function(){
			for(var key in Mia.optv) this.v[key] = Mia.optv[key];
			if(location.hash){
				this.parse_frag(location.hash.substr(1));
			}
			if(location.search){
				location.search.substr(1).split(/[&;]/).forEach(function(kvs){
					var kv = kvs.split("=");
					this.v[kv[0]] = kv[1] ? decodeURIComponent(kv[1].replace(/\+/g, " ")) : null;
				}, this);
			}
			this.base = this.v.u && this.v.u.match(/^https?:/) ? this.v.u : get_base(this.v.u || "");
			if(this.v.inf){
				if(! window.parent) this.v.inf = 0;
				else if(window.parent.ifr) this.dual = true;
			}
			this.get_status();
			
			function get_base(reluri){
				var a = Mut.dom.elt("a","",[["href", reluri]]);
				return a.href;
			}
		},
		parse_frag: function(frag){
			frag.split(/[&;]/).forEach(function(opt){
				if(opt.match(/^p(\d+)$/)) this.v.page = Number(RegExp.$1); else
				if(opt.match(/^pv(\d+)$/)) this.v.pv = Number(RegExp.$1); else
				if(opt.match(/^([\w\d]+)=(.*)/)) this.v[RegExp.$1] = 
				decodeURIComponent(RegExp.$2.replace(/\+/, " "));
			}, this);
		},
		vc: function(key, val){
			return this.v[key] && this.v[key]===val;
		},
		check_start_pos: function(){
			var cpos = 0;
			if(this.v.page){
				cpos = this.v.page - 1;
				if(Miiif.cview.paged){
					cpos = Miiif.cview.p2pv(cpos);
					if(cpos === -2) console.log("non-paged canvas");
				}
			}else if(this.v.pv){
				if(Miiif.cview.paged) cpos = this.v.pv - 1;
				else cpos = Miiif.cview.p2pv(null, this.v.pv);
			}else if(this.v.canvas){
				if(this.v.canvas.match("^//")) this.v.canvas = Mia.keyuris[0].split(/:/).shift()+":"+this.v.canvas;
				cpos = Mia.keyuris.indexOf(this.v.canvas);
				if(cpos === -1 && Miiif.cview.paged){
					var cinfo = Mia.cinfo[this.v.canvas];
					if(cinfo){
						var pref = cinfo.pagedref;
						if(pref) cpos = Mia.keyuris.indexOf(pref);
					}
				}
			}else if(this.v.lb){
				if((cpos = Mpj.labels.indexOf(this.v.lb)) === -1) cpos = 0;
				else if(Miiif.cview.paged) cpos = Miiif.cview.p2pv(cpos+1);
			}
			if(cpos > Mia.env.numTiles){
				console.warn("Non existing start page", cpos);
				cpos = 0;
			}else if(cpos === -1) console.warn("Non existing canvas");
			else if(cpos === -2) console.warn("non-paded canvas in paged view");
			return cpos;
		},
		
		
		set_style: function (style, use_replace){
			if(use_replace){
				style = style.replace(/show-vertical;?/, this.antparam.popup + " {writing-mode: vertical-rl; height:auto; max-height: 180px; min-height:120px; min-width: 60px;}").
				replace(/border_color:\s*([#\w\d]+);?/, this.antparam.boxpfx + "inner {border-color: $1}");
			if(!Object.assign) style = style.replace(/vertical-rl/, "tb-rl");
			}
			
			var ss = document.styleSheets;
			var st = ss[ss.length -1];
			var rules = style.match(/\s*([^{]+?\s*{[^}]+?})/g); 
			for(var i=0, n=rules.length; i<n; i++){
				st.insertRule(rules[i], st.cssRules.length);
			}
		},
		get_status: function(){
			Muib.state.narrowscrn = document.body.clientWidth < 900 ? true : false;
		}
	},
	set_annotroious_handlers: function() {
		if(Mwa.antrs._mk_setup_done) return;
		else Mwa.antrs._mk_setup_done = true;
		Mwa.antrs.addHandler("onAnnotationCreated", function(annot){
			Manno.set_new(annot);
		});
		Mwa.antrs.addHandler("onAnnotationUpdated", function(annot){
			annot.modified= at.getUTCdateTime();
			annot.text = at.md2link(annot.text);
			Manno.set_changed(0, annot);
		});
		Mwa.antrs.addHandler("onAnnotationRemoved", function(annot){
			Manno.set_changed(-1, annot);
		});
		Mwa.antrs.addHandler("onPopupShown", function(annot){
			Manno.set_frag_annot(annot);
			Manno.hilite_annoclip(annot);
		});
		Mwa.antrs.addHandler("beforePopupHide", function(popup){
			Manno.hilite_annoclip(null);
		});
	},

	proc_loaded: function(e, newuri){
		var cinfo, myviewer = this.osdv.viewer,
		prevuri = this.env.keyuri;
		if(!newuri) newuri = this.key_uri();
		
		if(!this.setup_done) this.proc_initial_load();
		
		if((this.env.keyuri = Muib.update_page.anno(prevuri, newuri))) cinfo = this.cinfo[this.env.keyuri];
		
		this.env.imgurl = (cinfo && cinfo.imgurl) ? cinfo.imgurl : this.env.keyuri;
		
		if(myviewer.source) this.env.dim = myviewer.source.dimensions;
		else if(!Muib.state.is_error) console.warn("no viewer.source", myviewer);
		
		if(cinfo) this.layers.add_layer();
		
		if(this.env.type === "image"){
			Muib.update_page.subcanvas(cinfo, prevuri, newuri);
			Muib.update_page.medias(cinfo, prevuri, newuri);
			if(newuri && !Muib.state.is_error){
				fadein_canvas(this);
				fit_image();
				if(newuri === this.env.loaded_uri) console.log("more proc_loaded");
			}else{
				Miiif.fit_done = false;
			}
		}

		function fadein_canvas(that){
			if(cinfo.loaded){
				Muib.tool.fadeio(that.elt.osdcanvas, 100, 0);
			}else{
				Muib.tool.fadeio(that.elt.osdcanvas, 20, 0);
				Muib.state.loadinfo = Mut.uri.set_action_info("on", newuri);
				Muib.appb.set_msg("loading image " + Muib.state.loadinfo[0] + "...", "normal", 500);
				Muib.state.loading = true;
				if(myviewer.source) check_dim(cinfo);
				cinfo.loaded = true;
			}
		}
		function fit_image(){
			if(Miiif.cview.paged && Muib.state.paged_zoom){
				if(cinfo.need_refit ||
					(cinfo.center && (
					Math.abs(Muib.state.pagedCenter.x - cinfo.center.x) > 0.2 ||
					Math.abs(Muib.state.pagedCenter.y - cinfo.center.y) > 0.2)
				)){
					Miiif.fit_done = false;
					Muib.state.loading = true;
				}else myviewer.viewport.zoomTo(Muib.state.paged_zoom, null, true);
			}else if(cinfo.layer){
				Miiif.fit_done = false;
				Muib.state.loading = true;
			}
		}
		function check_dim(ci){
			var dim = myviewer.source.dimensions;
			if(!dim){
				console.warn("no source dimensions");
			}else if(ci.dim){
				if(ci.dim.x !== dim.x || ci.dim.y !== dim.y){
					var r = [ci.dim.y / ci.dim.x, dim.y / dim.x], rratio = r[0] / r[1];
					if(rratio > 1.25 || rratio < 0.75){
						console.warn("different aspect ratio: original", r[0], "source", r[1]);
						ci.orgdim = {x: ci.dim.x, y: ci.dim.y};
						ci.dim.x = dim.x;
						ci.dim.y = dim.y;
					}
					Miiif.fit_done = false;
					ci.need_refit = true;
				}
			}else{
				ci.dim = {x: dim.x, y: dim.y};
			}
			ci.dim.temp = false;
			ci.need_dimcheck = false;
		}
	},
	proc_initial_load: function(){
		if(this.env.type === "image"){
			if(!Muib.state.is_error) Muib.appb.set_msg("on load init ...");
			this.setup_done = true;
			
			var ov = this.opts.v;
			if(ov.xy) this.osdv.pan(ov.xy);
			else if(ov.xywh) this.osdv.fit_bounds(ov.xywh);
			this.refstrip.setup();
			Manno.setup_annotations();
		}else{
			Mavannot.setup();
			if(this.struct.data.length) this.tindex.setup({});

			if(Mav.vinfo.bgtile){
			}
		}
	},
	
	
	proc_media: function(url, tile, oa, type){
		var keyurl = Miiif.map[url] || url;
		Muib.tool.load_script("avannot.js", true).onload = function(){
			Mia.init(tile, oa, null, type);
			if(url.match(/^https?:\/\/(www.youtube.com\/watch|youtu.be)/)){
				Mav.init(url, "youtube", tile.length);
			}else{
				Mav.init(url, type, tile.length);
			}
		};
	},

	key_uri: function (){
		var s = this.osdv.viewer.source; 
		var uri = s ? (s.canvas || s.url) : null;
		if(uri){
			return uri;
		}else{
			return this.keyuris[this.get_pos(this.osdv.viewer.currentPage())];
		}
	},
	get_pos: function(pos){
		if(pos===undefined) pos = this.osdv.viewer.currentPage();
		return this.env.rtl ? this.env.numPages - pos - 1 : pos;
	},
	ci: function(){
		return this.cinfo[Mia.key_uri()];
	},
	ask_image: function(ev){
		if(ev.ctrlKey){
			var cand = Mia.env.imgurl,
			msg = "Get current image? (",
			dest;
			if(Miiif.use){
				if(!ev.shiftKey) cand = Miiif.full2mid(cand, 1000);
				msg += (cand.match(/\/full/) ? Mut.uri.signat(cand, 4) : Mut.uri.filename(cand)) +
				(cand.match(/(jpg|jpeg|png|svg|gif|tif)$/) ? "; modify URI if necessary" : ": could be unloadable");
			}else msg += Mut.uri.filename(cand);
			msg += ")";
			dest = prompt(msg, cand);
			if(dest) location.href = dest;
		}else{
			alert("Ctrl + click to get current image");
		}
	}

};


var Mpj = {
	ctxs: {
		webanno: "www.w3.org/ns/anno.jsonld",
		iiif_p: "iiif.io/api/presentation/",
		iiif_p2: "iiif.io/api/presentation/2/context.json",
		iiif_p3: "iiif.io/api/presentation/3/context.json",
		iiif_i: "iiif.io/api/image/",
		iiif_s: "iiif.io/api/search/",
		iiif: "iiif.io",
		scv: "www.shared-canvas.org/ns/context.json",
		iiif_i_sf: "library.stanford.edu/iiif/image-api/1.1/context.json",
		ixif: "wellcomelibrary.org/ld/ixif/0/context.json",
		used: null
	},
	other_ctxs: [],
	au_called : false,
	uribase: null,
	labels: [],
	type: "Document", 

	proc_json: function (jsonA, jsonB, moreurl){
		if(!jsonA){
			Muib.appb.set_msg("Empty JSON. Nothing to process", "error");
		}else if(moreurl){
			Muib.appb.set_msg("parsing first ...");
			this.au_called = true;
			Mia.setup(moreurl, jsonA);
		}else{
			Muib.appb.set_msg("parsing ...");
			var data = this.au_called ? [jsonB, jsonA] : [jsonA, jsonB];
			try{
				Mia.jsource = this.parse_json(data[0]);
				var res = Mia.parsed_obj = this.proc_annot(Mia.jsource);
				if(data[1]){
					var revtile = this.get_more_annot(data[1], res.anno, 0);
					if(revtile && res.tile.length){
						Muib.appb.set_msg("reverse tile order");
						res.tile.reverse();
					}
				}
				Mia.set_job(res);
			}catch(e){
				console.error(e);
				if(e.message.match(/Unexpected token (.*) in JSON at position (\d+)/)){
					var token = RegExp.$1;
					var pos = Number(RegExp.$2);
					var spos = pos > 20 ? pos - 20 : 0;
					console.log("Error >>> "+(spos ? "...":"") + data[0].substr(spos, 40) + "...");
				}
				Muib.appb.set_msg(e.message, "error");
			}
		}
		
	},
	parse_json: function(data){
		if(typeof(data)==="object") return data;
		try{
			var json = JSON.parse(data);
		}catch(e){
			this.unparsed = data;
			if(e.message.match(/^(Unexpected token [\r\n\t]|JSON.parse: bad control character|Invalid character)/)){
				console.log("★★ "+RegExp.$1+" in JSON. Will fix...");
				json = JSON.parse(data.replace(/[\r\n\t]/g, " "));
			}else{
				throw e;
			}
		}
		return json;
	},
	
	proc_annot: function (def){
		var tile = [],
		info = {
			type:{},
			accum_dur: 0
		},
		procres = null,
		ctxt = this.ctxs.used = this.find_context(def);
		if(ctxt === this.ctxs.webanno){
			this.type = "Web Annotation";
			var imgurls = {};
			this.set_ent_meta(def);
			Mpj.set_direction(def.options, "rlt");
			procres = this.webannot.proc(def, true, imgurls, info);
			set_tile(imgurls, tile);
		}else if(ctxt === this.ctxs.iiif_p || ctxt === this.ctxs.scv){
			procres = Miiif.proc_manifest(def, tile, info);
		}else if(
			def["@type"] || def.type
			|| def.sequences
			|| def.items
			|| def.content
		){
			console.warn("@context is not Presentation API:", def["@context"]);
			Miiif.vers.set_prop(def.type ? 3 : 2);
			Mpj.ctxs.nonstandard = true;
			procres = Miiif.proc_manifest(def, tile, info);
		}else if(ctxt === this.ctxs.iiif_i || ctxt === this.ctxs.iiif_i_sf){
			this.type = "info.json";
			tile.push(Mia.opts.v.u);
			Mut.arr.uniq_push(Mia.keyuris, Mia.opts.v.u);
			Mia.cinfo[Mia.opts.v.u] = {};
			
		}else if(ctxt === "open_images_dataset"){
			this.type = "Web Annotation";
			var imgurls = {};
			procres = this.proc_openimages(def, imgurls, info);
			set_tile(imgurls, tile);
			
		}else{
			info.error = "Unknown context: " + ctxt;
		}
		
		var res = {"type": null, "tile": tile, "anno": null, "info": info};
		if(typeof(procres)==="string"){
			res.type = this.type = procres;
		}else{
			res.anno = procres;
			if(Object.keys(info.type).length){
				var basetype = Object.keys(info.type)[0];
				res.info.url = info.type[basetype][0][0];
				res.info.format = info.type[basetype][0][1];
				res.type = basetype.toLowerCase();
			}else if(info.accum_dur){
				res.type = "simple";
			}else{
				res.type = "image";
			}
		}
		if(!info.error) Muib.meta.add(def);
		return res;
		
		function proc_nocontext_type(type2, type3, that){
			var v;
			if(type2){
				that.type = type2.replace(/^sc:/, "");
				v = 2;
			}else{
				that.type = type3;
				v = 3;
			}
			Miiif.vers.set_prop(v);
			Mut.str.set_prop("iiif");
			if(that.type === "Collection"){
				return Miiif.collection.proc(def);
			}else if(that.type === "Canvas"){
				console.warn("No context. Assuming canvas");
				procres = Miiif.proc_manifest(def, tile, info);
			}else info.error = "Unknown type " + that.type;
			return null;
		}
		
		function set_tile(imgurls, tile){
			for(var url in imgurls){
				if(Mia.env.rtl) tile.unshift({"type": "image", "url": url});
				else tile.push({"type": "image", "url": url});
				Mut.arr.uniq_push(Mia.keyuris, url);
			}
		}
	},
	
	get_more_annot: function (json, objanno, idx){
		Muib.appb.set_msg("get more annot ...");
		var that = this,
		def = this.parse_json(json),
		tile_reverse = false,
		set_descr = idx > 0 ? false : true,
		defs;
		if(def instanceof Array) defs = def;
		else defs = [def];
		Mia.jsourcem.push(def);
		var annot = {}, info = {type:{}},
		res = {"count": 0};
		defs.forEach(function(def){
			Mut.obj.merge(annot, proc_one(def));
		});
		if(Object.keys(annot).length){
			for(var uri in annot){
				objanno[uri] = objanno[uri] ? objanno[uri].concat(annot[uri]) : annot[uri];
			}
		}else if(res.count === 0){
			console.log("empty (more) annotation");
			if(!set_descr) Mia.tindex.set_data_an_attr(0);
		}
		return tile_reverse;
		
		function proc_one(def){
			var ctxt = that.find_context(def),
			anno;
			if(ctxt === that.ctxs.webanno){
				anno = that.webannot.proc(def, set_descr, null, info);
			}else if((ctxt && that.is_iiif_ctxt(ctxt)) || def.resources){
				if(def.structures && Mia.struct.data.length===0) Mia.struct.data = def.structures;
				var viewrtl = Mia.env.rtl;
				if(Mpj.set_direction(def, "right-to-left") !== viewrtl) tile_reverse = true;
				if(!Muib.meta.added){
					this.set_ent_meta(def);
					Muib.meta.add(def);
				}else{
					Muib.meta.set_more_prop(def);
				}
				anno = Miiif.proc_embed(def, res, idx);
			}else if(def.annotation){
				anno = Miiif.proc_embed(def.annotation, res, idx);
			}else{
				console.warn("unknown context", ctxt);
				return false;
			}
			return anno;
		}
		
	},
	webannot: {
		imgurls: [],
		info: {},
		set_descr: false,
		proc: function(def, set_descr, imgurls, info){
			this.info = info;
			this.imgurls = imgurls;
			this.set_descr = set_descr;
			var ago = this.get_annoset(def), annot = {};
			Mut.str.set_prop("json-ld");
			for(var i=0, n=ago.length; i<n; i++){
				if(ago[i].target instanceof Array){
					ago[i].target.forEach(function(t){
						var agc = Mut.obj.copy(ago[i]);
						agc.target = t;
						this.proc_target(agc, annot);
					}, this);
				}else{
					this.proc_target(ago[i], annot);
				}
			}
			return annot;
		},

		get_annoset: function(def){
			var anarr = def.items || def.images || [];
			if(def["as:items"]) anarr = anarr.concat(def["as:items"]);
			if(def["@graph"]) anarr = anarr.concat(def["@graph"]);
			return anarr.length ? anarr : [def];
		},
		proc_target: function(ag, annot){
			var tg = ag.target.id || ag.target;
			var url = this.get_base_frag(ag, tg),
			keyuri = url.base;
			if(!Mia.cinfo[keyuri]) Mia.cinfo[keyuri] = {};
			if(url.frag) this.register_anno(annot, ag, url, keyuri);
			else if(this.set_descr){
				var label = Mpj.set_label(ag, url.base),
				descr = at.gettext(ag);
				if(!label) Mpj.set_label({"label": descr}, url.base);
				Mia.cinfo[keyuri].description = descr;
				if(ag.body instanceof Array) this.multi_body(annot, ag, url, this.info);
			}
			Mia.cinfo[keyuri].urisig = Mut.uri.signat(keyuri);
			
			if(ag.target.type && ag.target.type !== "Image"){
				this.set_info_type(ag.target.type, url.base, ag.target.format, this.info);
			}else{
				if(this.imgurls !== null && ! this.imgurls[url.base]) this.imgurls[url.base] = true;
			}
		},
		set_info_type: function(tgtype, url, format, info){
			Mut.arr.add(info.type, tgtype, [url, format]);
		},
		get_base_frag: function(ag, tg){
			var baseurl, fragment = "", pu = Mut.frag.parse_uri(tg);
			if(pu[3]){
				baseurl =pu[0];
				fragment = pu[3];
				if(ag && !ag.target.selector) ag.target = {
					id: tg, 
					selector: {value: fragment}
				};
			}else if(ag.target.selector){
				baseurl = ag.target.source;
				fragment = ag.target.selector.value;
			}else{
				baseurl = pu[0];
			}
			return {"base": baseurl, "frag": fragment};
		},
		register_anno: function(annot, ag, url, keyuri){
			if(! annot[url.base]) annot[url.base] = [];
			if(ag.body){
				if(ag.body instanceof Array) this.multi_body(annot, ag, url, this.info);
				else this.single_body(annot, ag, url);
			} else
				annot[url.base].push(ag);
			
			if(this.set_descr && !Mia.cinfo[keyuri].label){
				Mia.cinfo[keyuri].label = ag.label ? ag.label : at.gettext(ag, 16);
			}
		},
		single_body: function(annot, ago, url){
			annot[url.base].push(this.select_one_body(ago, "body"));
		},
		select_one_body: function(ago, bodyp){
			if(!ago[bodyp]) {
				ago[bodyp] = {"value": "", "type": "TextualBody"};
				return ago;
			}
			if(ago[bodyp].items && (ago[bodyp].type && ago[bodyp].type === "Choice")){
				var agc = Mut.obj.copy(ago);
				agc[bodyp] = Mut.str.lang_obj(ago[bodyp].items);
				if(ago[bodyp].format) agc[bodyp].format = ago[bodyp].format;
				return agc;
			}else{
				return ago;
			}
		},

		multi_body: function(annot, ago, url, info){
			var agc = Mut.obj.copy(ago), media = null, candg = [];
			delete agc.body;
			if(!agc.id) agc.id = at.anbase.pfx + ":" + at.md5(url.base + "#" + url.frag);
			ago.body.forEach(function(b, i){
				var theag = Mut.obj.copy(agc);
				if(typeof(b) === "string"){
					theag.bodyValue = b;
					theag.id += "-" + i;
					candg.push(theag);
				}else if(b.type && b.type === "Audio"){
					media = this.get_base_frag(null, b.id);
					this.set_info_type(b.type, media.base, b.format, info);
				}else{
					["creator", "created"].forEach(function(p){
						if(b[p]) theag[p] = Mut.obj.copy(b[p]);
						delete b[p];
					});
					if(b.id){
						theag.id = b.id;
						delete b.id;
					}else{
						theag.id += "-" + i;
					}
					theag.body = b;
					candg.push(this.select_one_body(theag, "body"));
				}
			}, this);
			if(!candg.length){
				agc.bodyValue = "";
				candg.push(agc);
			}
			if(media){
				candg.forEach(function(cg){
					if(typeof(cg.target) === "string") cg.target = {id: cg.target};
					cg.target.media = media;
				});
			}
			annot[url.base] = annot[url.base] ? annot[url.base].concat(candg) : candg;
		}
	},
	
	set_label: function(obj, uri){
		var lb;
		if(obj.label){
			lb = Mut.str.lang_val(obj.label);
			if(lb.match(/^\s*$/)) lb = undefined;
			else this.set_maxlabel(lb);
			Mia.cinfo[uri].label = lb;
		}
		this.labels.push(lb);
		return lb;
	},
	set_maxlabel: function(lb){
		var lblen = lb.length;
		if(lblen > Mia.tindex.labels.max.len){
			Mia.tindex.labels.max.len = lblen;
			Mia.tindex.labels.max.text = lb;
		}
		Mia.tindex.labels.acc += lblen;
	},
	set_ent_meta: function(def){
		Muib.meta.lang.watch = true;
		Mia.ent.label = Mut.str.lang_val(def.label) || null;
		Mia.ent.description = Mut.html.safe_text(def.description || def.summary) || null;
		Muib.meta.lang.watch = false;
	},
	set_direction: function(def, rtlstr){
		var dir = def ? (def.viewingDirection || def.renderingDirection) : undefined;
		if(Mia.opts.v.dir){
			Mia.env.rtl = (Mia.opts.v.dir === "rtl");
			Miiif.vinfo.dir = [dir, Mia.opts.v.dir];
		}else if(dir){
			if(dir === rtlstr){
				Mia.env.rtl = true;
				Miiif.vinfo.dir = [dir, rtlstr];
			}else Miiif.vinfo.dir = [dir, dir];
		}
		Mia.env.original_rtl = Mia.env.rtl;
		return Mia.env.rtl;
	},
	find_context: function (def){
		if(Mia.opts.v.context) return noscheme(Mia.opts.v.context);
		if(def["options"]) {
			if(Object.assign) Object.assign(Mia.opts.v, def["options"]);
			else Mut.obj.merge(Mia.opts.v, def["options"]);
		}
		var ctxt = Mut.get_first(def)["@context"],
		context = null,
		shortctxt = null;
		if(typeof(ctxt) === "undefined"){
			return test_nocontext(def);
		}else if(typeof(ctxt) === "string"){
			context = noscheme(ctxt);
			if((shortctxt = Miiif.vers.check(context))) return shortctxt;
			else return context;
		}
		var valid = null;
		for(var i in ctxt){
			if(typeof(ctxt[i]) === "object"){
				if(ctxt[i]["@base"]) Muib.state.uribase = this.uribase = ctxt[i]["@base"];
			}else if(typeof(ctxt[i]) === "string"){
				context = noscheme(ctxt[i]);
				if(context === this.ctxs.webanno) valid = context;
				else if((shortctxt = Miiif.vers.check(context))) valid = shortctxt;
				else this.other_ctxs.push(context);
			}
		}
		return valid || context;
		
		function noscheme(uri){
			return Mut.scheme.trim(uri).
			replace(/context\.jsonld$/, "context.json");
		}
		
		function test_nocontext(def){
			var item = (def instanceof Array) ? def[0] : def[Object.keys(def)[0]];
			if(item.image && item.image.url && item.objects instanceof Array && item.objects[0].bounding_box){
				return "open_images_dataset";
			}
			return undefined;
		}
	},
	test_support: function(){
		var res = null;
		var ms, el;
		if((ms = Mia.jsource.mediaSequences) && (el = ms[0].elements)){
			if(el[0].format && el[0].format.substr(0, 5) === "video"){
				Mia.elt.msg.style.zIndex = -2;
				if(Mia.osdv.viewer.messageDiv) Mia.osdv.viewer.messageDiv.style.display = "none";
				var vurl = el[0][Miiif.a.id];
				Muib.appb.set_msg("try loading " + vurl, "normal");
				Mia.proc_media(vurl);
			}else{
				res = "This manifest seems to use unsupported IxIF context. "+
				"Intented content ("+ (el[0].format || el[0][Miiif.a.type]) +") " +
				"might be found at <a href=\"" + el[0][Miiif.a.id] + "\">" + 
				Mut.uri.disp(el[0][Miiif.a.id]) + "</a>.";
				Mia.elt.msg.style.zIndex = 10;
			}
		}
		return res;
	},
	is_iiif_ctxt: function(ctxt){
		return (ctxt.substr(0, 7) === this.ctxs.iiif || ctxt === this.ctxs.scv);
	},
	proc_openimages: function(json, imgurls, info){
		
		var meta = set_meta(),
		annot = {};
		this.webannot.info = info;
		this.webannot.imgurls = imgurls;
		this.webannot.set_descr = true;
		for(var id in json){
			var item = json[id],
			imgurl = item.image.url,
			label = item.image.footnote_top_right.replace(/^Title: /, ""),
			annobjects = item.objects;
			this.webannot.proc_target({
				label: label,
				target: imgurl,
				attribution: item.image.footnote_bottom_right
			}, annot);
			Mia.cinfo[imgurl].metadata = "<dl>\n" + Muib.meta.gen_dtdd({"Attribution": [item.image.footnote_bottom_right]}) + "</dl>";
			if(item.image.footnote.match(/href='([^']+)' target='_blank'>Thumbnail/)){
				Mia.cinfo[imgurl].thumbnail = RegExp.$1;
				Miiif.cvs.thumb_count++;
			}
			annobjects.forEach(function(anobj){
				var bbox = anobj.bounding_box,
				sel = [bbox.xmin * 100, bbox.ymin * 100, (bbox.xmax - bbox.xmin) * 100, (bbox.ymax - bbox.ymin) * 100];
				this.webannot.proc_target({
					target: imgurl + "#xywh=percent:" + sel.join(","),
					bodyValue: anobj.text
				}, annot);
			}, this);
		}
		for(var key in meta) json[key] = meta[key];
		return annot;
		
		function set_meta(key){
			var mat;
			if((mat = Mia.opts.v.u.match(/_m_([_a-z\d]+)\.json$/))){
				OpenSeadragon.makeAjaxRequest({
					"url": "/works/2018/test/open-image-classes.json",
					"success": function(xhr) {
						var classes = JSON.parse(xhr.response);
						Mia.ent.label = classes[mat[1]] + " (OpenImages)";
						if(Muib.appb.fname_h1){
							Muib.appb.h1.innerHTML = Mia.ent.label;
							document.title = Mia.ent.label + " - Image Annotator";
						}
					},
					"error": function(e){console.warn(e);}
				});
			}
			return {
				attribution: "<a href='https://storage.googleapis.com/openimages/web/'>Open Images Dataset V4</a>",
				license: "https://creativecommons.org/licenses/by/4.0/"
			};
		}
	}
};


var Manno = {
	page: {},
	current: [],
	tp: {},
	frags: {}, 
	tpfrags: {},
	strange: {}, 
	total: 0, 
	maxgw: 0,
	edit: false,
	edited: {},
	osd_src: "dzi://openseadragon/something",
	temp: null,
	setup_done: false,
	use_avanno: false,
	clip_hilited: false,
	pop_showing: 0,
	
	setup_annotations: function (){
		var annot = {},
		oauris = Mia.oa ? Object.keys(Mia.oa) : [],
		has_anno = 0;
		if(oauris.length) for(var uri in Mia.oa) 
			has_anno += this.oa2annotorious(annot, Mia.oa, uri, this.frags);
		if(Object.keys(this.edited).length) for(var uri in this.edited){
			if(oauris.indexOf(uri) !== -1) continue;
			has_anno += this.oa2annotorious(annot, this.edited, uri, this.frags);
		}
		if(has_anno) Muib.jldpanel.showbtn();
		if(Mia.env.numTiles > 1 || Mia.struct.data.length > 0 || Miiif.cview.layer){
			Mia.tindex.setup(annot);
		}else{
			Mia.tindex.set_tiledesc(0, Mia.keyuris[0]);
		}
		this.counter.user(0);
		if(!Muib.state.is_error) Muib.appb.set_msg("done annot setup", "logonly");
		this.page = annot;
		this.resolve_deferred(0);
	},
	
	oa2annotorious: function (annot, oa, uri, frags){
		var ancount = 0,
		keyuri,
		suri,
		tguri = uri,
		uritype = 0;

		if((suri = Mut.scheme.arr_exists_another(Mia.keyuris, uri, true))){
			keyuri = tguri = suri;
			uritype = 1;
		}else if((suri = Mut.scheme.exists_another(Miiif.map, uri, true))){
			keyuri = tguri = Miiif.map[suri];
			uritype = 2;
		}else if(Miiif.cview.paged){
			uritype = 3;
			if(Mia.cinfo[uri]) keyuri = Mia.cinfo[uri].pagedref;
			else{
				suri = Mut.scheme.swap(uri);
				uritype = 4;
				if(Mia.cinfo[suri]) keyuri = tguri = Mia.cinfo[suri].pagedref;
				else{
					uritype = 5;
					console.warn("non-registered anno target (paged)", uri);
					Mia.cinfo[uri] = {};
					keyuri = uri;
				}
			}
		}else{
			uritype = 6;
			keyuri = uri;
		}
		if(!keyuri){
			console.warn("No matching key URI found for", uri, ", uritype", uritype);
			return 0;
		}else if(!Mia.cinfo[keyuri]){
			console.warn("No matching info found for", keyuri, ", uritype", uritype, oa);
			return 0;
		}else if(!Mia.cinfo[keyuri].dim){
			annot[keyuri] = "defer";
			return 0;
		}
		var x_offset = 0,
		page = keyuri;
		if(Miiif.cview.paged){
			x_offset = check_offset(tguri);
			page = Mia.cinfo[keyuri].pagedref || keyuri;
		}
		var osd_offst = Mia.cinfo[tguri].offstx;
		if(!annot[page]) annot[page] = [];
		if(!frags[keyuri]) frags[keyuri] = {};
		var aa,
		anid,
		edited = this.edited[uri] || {},
		edids = {};
		Object.keys(edited).forEach(function(id){edids[id] = 1;});
		for(var i=0, n=oa[uri].length; i<n; i++){
			if(!oa[uri][i].target.selector) continue;
			if((anid = oa[uri][i].id) && edited[anid]){
				aa = get_from_edited(edited[anid], x_offset, osd_offst);
				delete edids[anid];
				if(!aa) continue;
			}else{
				aa = Mwa.to_annotorious(
					oa[uri][i],
					this.osd_src,
					get_dim(tguri, x_offset),
					uri,
					frags[keyuri]
				);
				if(uri !== keyuri) aa.mappeduri = uri;
				if(edited[aa.id]){
					delete edids[aa.id];
					if(edited[aa.id].deleted) continue;
					aa.text = edited[aa.id].text;
				}
				if(aa.shapes[0].geometry) this.maxgw = Math.max(this.maxgw, aa.shapes[0].geometry.width);
			}
			annot[page].push(aa);
			ancount++;
		}
		if(Object.keys(edids).length){
			for(anid in edids) if((aa = get_from_edited(edited[anid], x_offset, osd_offst))){
				annot[page].push(aa);
				ancount++;
			}
		}
		return ancount;
		
		
		function check_offset(keyuri){
			var ci = Mia.cinfo[keyuri], offset = 0;
			if(ci.layer){
				if(ci.layer[0].loc.x > 0) offset = Mia.cinfo[ci.pagedcv].dim.x;
			}else if(ci.pagedref){
				if(Mia.cinfo[ci.pagedref].layer[1].loc.x > 0) offset = Mia.cinfo[ci.pagedref].dim.x;
			}
			return offset;
		}
		function get_dim(tguri, x_offset){
			var dim;
			if(Mia.cinfo[tguri] && Mia.cinfo[tguri].dim){
				dim = Mia.cinfo[tguri].dim;
				if(x_offset){
					dim.x_offset = x_offset;
					dim.option = Miiif.cview.dim_option;
				}
			}
			return dim;
		}
		
		function get_from_edited(an, x_offset, osd_offst){
			if(an.deleted) return false;
			if(an.has_offset){
				if(Miiif.cview.paged) an.shapes[0].geometry.x += osd_offst;
				else an.shapes[0].geometry.x -= osd_offst;
			}else if(Miiif.cview.paged && osd_offst){
				an.shapes[0].geometry.x += osd_offst;
				an.has_offset = true;
			}
			return an;
		}
	},
	resolve_deferred: function(idx){
		var tganno, tgfrag, usetp, mtvn_type, annopagecount = 0;
		if(Mia.opts.v.tp){
			tganno = "tp";
			usetp = true;
			tgfrag = this.tpfrags;
		}else{
			tganno = "page";
			tgfrag = this.frags;
		}
		mtvn_type = "paint";
		for(var uri in Mia.defer[mtvn_type][idx]){
			var add_count = this.oa2annotorious(this[tganno], Mia.defer[mtvn_type][idx], uri, tgfrag);
			if(usetp){
				this.set_osd_overlay(uri, Mia.defer[mtvn_type][idx][uri], mtvn_type);
				Mia.tindex.set_data_an_attr(add_count, uri);
			}else annopagecount++;
		}
		mtvn_type = "highlight";
		for(var uri in Mia.defer[mtvn_type][idx]){
			var add_count = this.oa2annotorious(this.tp, Mia.defer[mtvn_type][idx], uri, this.tpfrags);
			this.set_osd_overlay(uri, Mia.defer[mtvn_type][idx][uri], mtvn_type);
			Mia.tindex.set_data_an_attr(add_count, uri);
		}
		Mia.defer.paint[idx] = {};
		return annopagecount;
		
	},
	set_osd_overlay: function(uri, oas, mtvn_type){
		var cinfo = Mia.cinfo[uri];
		if(!cinfo || !cinfo.dim) return;
		if(!cinfo) return false;
		oas.forEach(function(oa){
			var elt = Mut.dom.elt("div", "", [["class", "text" + mtvn_type]]),
			rect = Muib.tool.pix2viewportRect(oa.loc, cinfo.dim.x);
			elt.innerHTML = at.gettext(oa);
			if(mtvn_type === "paint") elt.onclick = Manno.toggle_textpaint;
			Mut.arr.add(cinfo, "overlay", {"element": elt, "location": rect});
		}, this);
	},
	
	toggle_textpaint: function(ev){
		var elt = ev.target;
		if(elt.classList.contains("transp")) elt.classList.remove("transp");
		else elt.classList.add("transp");
	},

	proc_prevpage: function(prevuri, newuri){
		if(this.current.length){
			this.save_current(prevuri);
			if(newuri){
				this.clear_current();
			}
		}else if(this.page[prevuri]){ 
			this.page[prevuri] = null;
		}else if(this.temp){
			Mwa.antrs.highlightAnnotation(undefined);
			Mwa.antrs.removeAnnotation(this.temp);
		}
	},
	proc_newpage: function(newuri){
		if(Muib.clip.allimg.checked){
			if(Mia.opts.v.clip === "all"){
				Muib.clip.toggle();
				Mia.opts.v.clip === "all_done";
			}
		}else Muib.clip.toggle(true);
		if(Muib.annobox.show === false) Muib.annobox.toggle();
		var ci = Mia.cinfo[newuri], oth = [];
		if(ci && ci.other) oth.push(newuri);
		if(Miiif.cview.paged && ci.pagedcv && Mia.cinfo[ci.pagedcv].other) oth.push(ci.pagedcv);
		
		if(oth.length
			&& !Miiif.searchs.has_result && !Miiif.cview.noannot){
			if(Mia.opts.v.foc === true){
				if(Muib.state.is_error) console.warn("load otherContent cancelled", newuri);
				else oth.forEach(function(othuri){Miiif.add_other_content(othuri);});
			}else Muib.annobox.oth(newuri);
		}else if(this.page[newuri]){
			if(this.page[newuri] === "defer"){
				ci.dim = Mia.osdv.viewer.source.dimensions;
				this.page[newuri] = null;
				this.oa2annotorious(this.page, Mia.oa, newuri, this.frags);
			}
			this.flush(newuri);
			this.flush_overlay(newuri);
			Muib.annobox.ready(false);
		}else{
			Mia.env.anno = this.current = [];
			this.flush_overlay(newuri);
			Muib.clip.showctrl(false);
			Muib.annobox.ready(true);
		}
	},
	save_current: function(prevuri){
		if(this.edit) this.page[prevuri] = this.current;
		if(!Mia.cinfo[prevuri].dim) Mia.cinfo[prevuri].dim = Mia.env.dim;
	},
	clear_current: function(){
		Mwa.antrs.highlightAnnotation(undefined);
		if(Mwa.antrs.getAnnotations().length) Mwa.antrs.removeAll();
	},
	flush: function(newuri){
		if(this.page[newuri][0].pix){
			Mwa.check_geometry(this.page[newuri]);
		}else if(Mia.cinfo[newuri].need_dimcheck){
			check_dim(newuri, this);
		}
		flush_annotation(newuri, this);
		Muib.jldpanel.showbtn();
		Muib.clip.showctrl(true);

		function flush_annotation(uri, that){
			Mia.env.anno = that.current = that.page[uri];
			that.current.forEach(function(a){
				if(a.has_region === undefined || a.has_region === true)
				Mwa.antrs.addAnnotation(a);
			});
			if(Mia.env.is_touch_dev) Mia.osdv.viewer.antctrl.setup_touch_listener(that.current);
		}
		function check_dim(uri, that){
			var dim = Mia.osdv.viewer.source.dimensions;
			if(dim.x !== Mia.cinfo[uri].dim.x || dim.y !== Mia.cinfo[uri].dim.y){
				Mia.cinfo[uri].dim = dim;
				if(!Miiif.cview.paged) that.page[uri].forEach(function(a){
					if(a.id && that.edited[uri] && that.edited[uri][a.id]) return;
					Mwa.setup_geometry(a, Mwa.selector2frag(a.fragid, dim));
				}, that);
			}
			Mia.cinfo[uri].need_dimcheck = false;
		}
	},
	flush_overlay: function(uri){
		if(Mia.cinfo[uri] && Mia.cinfo[uri].overlay) Mia.cinfo[uri].overlay.forEach(function(ov){
			Mia.osdv.viewer.addOverlay(ov.element, ov.location);
		});
	},

	
	
	
	
	
	set_new: function(annot){
		this.set_anno_meta(annot, Mia.env.imgurl, Mia.osdv.viewer.source.dimensions, Miiif.use, "");
		this.current.push(annot);
		this.save_edited(annot, 1);
		Muib.clip.showctrl(true);
		if(Mia.env.is_touch_dev) Muib.jldpanel.toggle(null, "showjld");
		this.counter.update(1);
	},
	set_changed: function(delta, annot){
		this.counter.update(delta);
		this.save_edited(annot, delta);
	},
	save_edited: function(annot, delta){
		if(delta === -1) annot.deleted = true;
		var keyuri = annot.mappeduri || Mia.key_uri(), ci = Mia.ci();
		if(Miiif.cview.paged){
			var gx = annot.shapes[0].geometry.x,
			cx = ci.offstx || 1;
			if((Mia.env.rtl && gx < cx) || (!Mia.env.rtl && gx > cx)){
				if(Mia.cinfo[keyuri].pagedcv){
					keyuri = Mia.cinfo[keyuri].pagedcv;
					ci = Mia.cinfo[keyuri];
				}
			}
			if(gx > cx) annot.has_offset = true;
		}
		if(delta === 1 && !annot.text) annot.text = "(" + ci.label + ")";
		if(!this.edited[keyuri]) this.edited[keyuri] = {};
		this.edited[keyuri][annot.id] = annot;
	},
	set_anno_meta: function(annot, imgurl, dim, use_ratio, more_frag){
		annot.created = at.getUTCdateTime();
		annot.creator = Mia.env.user.id;
		if(!at.whoswho[Mia.env.user.id]) at.registWhoswho(Mia.env.user.id);
		annot.text = annot.text ? at.md2link(annot.text) : Mwa.antrs.getAnnotations().length.toString();
		annot.fragid = 
		annot.has_region === false ? more_frag :
		Mwa.getfrag(annot, dim, use_ratio)
		+ more_frag;
		annot.imgurl = imgurl;
		annot.id = Mwa.genid(annot.imgurl, annot.fragid);
		if(!this.frags[annot.imgurl]) this.frags[annot.imgurl]={};
		Mwa.savefrag(this.frags[annot.imgurl], annot, annot.fragid);
	},
	set_frag_annot: function(annot){
		if(! Mia.elt.popbox){
			Mia.elt.popbox = Mut.dom.get(".annotorious-popup-text")[0];
			Mia.elt.popbox.onclick = Muib.annopop.proc_click;
		}
		if(Mav.char_timer){
			Mia.elt.popbox.innerHTML = Mav.char_timer + Mia.elt.popbox.innerHTML;
			Mav.char_timer = "";
		}
		if(Muib.state.count.user > 1) Muib.annopop.add_more("", annot.creator);
		var frags = this.frags[Mia.env.keyuri] ? 
		this.frags[Mia.env.keyuri][annot.fragid] : (
			this.frags[Mia.env.tpos] ? this.frags[Mia.env.tpos] :
			null
		);
		if(frags && frags.length > 1) this.multi_annot(annot, frags);
	},
	multi_annot: function (annot, frags){
		var now, more = [], basetype = annot.has_region;
		for(var i=0,n=this.current.length; i<n; i++){
			var id = this.current[i].id;
			if(frags.indexOf(id) !== -1){
				if(this.current[i] === annot){
					now = i;
				}else{
					more.push(i);
				}
			}
		}
		more.forEach(function(i){
			if(this.current[i].has_region === basetype)
			Muib.annopop.add_more(this.current[i].text, this.current[i].creator, i);
			else console.log(this.current[i].has_region, basetype);
		}, this);
	},
	flipuser: function(i){
		Mwa.antrs.highlightAnnotation(this.current[i]);
	},
	hilite_annoclip: function(annot){
		var mviewer = Mia.osdv.viewer;
		if(Miiif.cview.paged) return;
		if(annot){
			if(this.current.length > 25){
			}else if(mviewer.world.getItemCount() === 1
				|| this.clip_hilited
			){
				var item = mviewer.world.getItemAt(0),
				upperitem,
				loc = Mwa.ratio2px(annot, item.source.dimensions, true),
				osdrec = new OpenSeadragon.Rect(loc[0], loc[1], loc[2], loc[3]);
				if(!this.clip_hilited){
					mviewer.addTiledImage({tileSource: item.source, clip: osdrec});
					this.clip_hilited = true;
				}else if((upperitem = mviewer.world.getItemAt(1))){
					upperitem.setClip(osdrec);
				}
				item.setOpacity(Mia.opts.v.hop);
				this.pop_showing++;
			}
		}else
		if(this.clip_hilited){
			this.pop_showing--;
			if(!this.pop_showing) mviewer.world.getItemAt(0).setOpacity(1);
		}
	},
	counter: {
		update: function(delta, other_cont){
			this.current = Mwa.antrs.getAnnotations();
			if(delta !== 0) anno_count(delta, this, Manno.current.length, other_cont);
			Manno.edit = true;
			
			function anno_count(delta, that, pagecount, other_cont){
				Manno.total += delta;
				Mia.tindex.ppos.innerHTML = Mia.tindex.ppos.innerHTML.replace(/\d+ ann.*/, Mia.tindex.anno_disp());
				Mia.tindex.set_data_an_attr(pagecount);
				that.user(delta, other_cont);
				if(pagecount === 0) Muib.annobox.btn.disabled = true;
				else if(pagecount ===1 && delta) Muib.annobox.btn.disabled = false;
			}
		},
		user: function (delta, other_cont){
			if(delta !== 0){
				if(Mia.env.user.numanno === 0 && ! other_cont) {
					at.registWhoswho(Mia.env.user.id);
				}
				Mia.env.user.numanno += delta;
				if(Mia.env.user.numanno === 0){
					delete at.whoswho[Mia.env.user.id];
				}
			}
			Muib.state.count.user = Object.keys(at.whoswho).length;
		}

	},

	
	
	
	
	anno2oa: {
		get_all: function(as_page_chbx){
			Muib.update_page.anno(Mia.key_uri());
			if(Miiif.use && (!Mia.opts.v.au || Miiif.cview.paged)){
				var annolist = [];
				for(var cvuri in Manno.page){
					this.get_cnvs_annot(cvuri, annolist);
				}
				return annolist;
			}else{
				return Mwa.getanno(Miiif.use, Manno.prepare_get_anno({}), Mpj.uribase, null, "Image", as_page_chbx.checked);
			}
		},
		get_one: function(uri, anno){
			if(Miiif.use && (!Mia.opts.v.au || Miiif.cview.paged)){
				return this.to_oa(anno, this.get_cvinfo(uri), uri);
			}else{
				return Mwa.get_oneanno(Miiif.use, anno, Mpj.uribase, null, "Image", Mia.key_uri());
			}
		},
		get_cnvs_annot: function(cvid, annolist){
			if(!Manno.page[cvid]) return null;
			var info = this.get_cvinfo(cvid);
			Manno.page[cvid].forEach(function(an){
				annolist.push(this.to_oa(an, info, cvid));
			}, this);
		},
		get_cvinfo: function(cvid){
			var ci = Mia.cinfo[cvid], info = {}, borderx, cvs, ci2;
			if(!ci) return null;
			if(Miiif.cview.paged && ci.layer){
				info.ci2 = Mia.cinfo[ci.pagedcv];
				if(ci.layer[0].loc.x > 0){
					info.borderx = ci.layer[0].loc.x;
					info.cvs = [ci.pagedcv, cvid];
				}else{
					info.borderx = ci.layer[1].loc.x;
					info.cvs = [cvid, ci.pagedcv];
				}
			}
			info.ci = ci;
			return info;
		},
		to_oa: function(an, info, cvid){
			var frag, tgcnvs;
			if(info.borderx){
				var adjst = {"offset": info.borderx, "altdim": info.ci2.dim, "cvidx": 0};
				frag = Mwa.ratio2px(an, info.ci.dim, true, adjst);
				tgcnvs = info.cvs[adjst.cvidx];
			}else{
				frag = Mwa.ratio2px(an, info.ci.dim, true);
				tgcnvs = cvid;
			}
			return this.as_webannot(
				(an.id || Mwa.genid(tgcnvs, frag)),
				an.text,
				tgcnvs + "#xywh=" + frag
			);
		},
		get_all_tabtext: function(){
			var ttxt = "";
			for(var keyuri in Manno.page){
				ttxt += this.get_tabtext(Manno.page[keyuri]);
			}
			return ttxt;
		},
		get_tabtext: function(annos){
			var ttxt = "";
			annos.forEach(function(an){
				an.fragid.match(/xywh=([\d,]+)/);
				ttxt += an.text + "\t" + RegExp.$1 + "\n";
			});
			return ttxt;
		},
		as_webannot: function(id, text, tg){
			var annot = {}, body = {}, atr = Miiif.a, val = Miiif.v;
			annot[atr.id] = id;
			annot[atr.type] = val.annotation;
			annot.motivation = val.painting;
			body[atr.type] = val.catext;
			body.chars = text;
			body.format = "text/plain";
			annot[atr.body] = body;
			annot[atr.target] = tg;
			return annot;
		}
	},
	prepare_get_anno: function(amap){
		var uri, annojson = [];
		for(uri in this.page){
			var ci = Mia.cinfo[uri],
			dim = ci.dim,
			annots = this.page[uri] === "defer" ? Mia.oa[uri] : this.page[uri];
			annots.forEach(function(an){
				if(an.id === "_pseudo") return;
				an.imgurl = ci.imgurl || uri;
				an.dim = dim;
				annojson.push(an);
				amap[an.id] = an;
			});
		}
		return annojson;
	},
	test_strange: function(){
		var temp = {}, frag = {};
		for(var uri in this.strange){
			this.oa2annotorious(temp, this.strange, uri, frag);
			var atemp = temp.undefined;
			Mwa.check_geometry(atemp);
			atemp.forEach(function(a){Mwa.antrs.addAnnotation(a);});
		}
	},
	
	pseudo_anno: function(text, frag, keyuri){
		if(this.temp) Mwa.antrs.removeAnnotation(this.temp);
		if(!keyuri) keyuri = Mia.key_uri();
		var geom = Mwa.selector2frag(frag, Mia.cinfo[keyuri].dim);
		var anobj =  {
			src: this.osd_src, 
			text: text,
			id: "_pseudo",
			shapes: [{type : "rect"}]
		};
		Mwa.setup_geometry(anobj, geom);
		Mwa.antrs.addAnnotation(anobj);
		Mwa.antrs.highlightAnnotation(anobj);
		this.temp = anobj;
	}

};



var Miiif = {
	use: false,
	level: {imgapi: 0, compliance: 0},
	map: {},
	dzi: false,
	curation: false,
	tfmedia: 0,
	locfmedia: 0,
	medias: {},
	num_video: 0,
	max_cvmedia: 0,
	cvs: {
		num: 0,
		ullist: [],
		thumb_count: 0,
		full_imgs: 0,
		fillers: 0	
	},
	vinfo: {dir: [], view: []},
	hint: {
		view: null
	},
	otherc: 0,
	tilemap: {},
	fit_done: false,
	usedSeq: null,
	anno_repl: null,
	a: null,
	v: null,
	vers: {
		v: null,
		attrs: {
			v2: {
				id: "@id",
				type: "@type",
				desc: "descriptin",
				content: "images",
				body: "resource",
				target: "on",
				vhint: "viewingHint",
				dir: "viewingDirection",
				coll_item: "members",
				start: "startCanvas"
			},
			v3: {
				id: "id",
				type: "type",
				desc: null,
				desc_arr: ["descriptin", "summary"],
				content: null,
				content_arr: ["items", "content"],
				body: "body",
				target: "target",
				vhint: "behavior",
				dir: "viewingDirection",
				coll_item: "items",
				start: "start"
			}
		},
		vals: {
			v2: {
				manifest: "sc:Manifest",
				image: "dctypes:Image",
				video: "dctypes:Video",
				audio: "dctypes:Audio",
				annotation: "oa:Annotation",
				collection: "sc:Collection",
				annolist: "oa:AnnotationList",
				annocollection: "oa:AnnotationCollection",
				catext: "cnt:ContentAsText",
				painting: "sc:painting"
			},
			v3: {
				manifest: "Manifest",
				image: "Image",
				video: "Video",
				audio: "Audio",
				annotation: "Annotation",
				collection: "Collection",
				annolist: "AnnotationPage",
				annocollection: "AnnotationCollection",
				catext: "ContentAsText",
				painting: "painting"
			}
		},
		pat_iiif: new RegExp("^(" + 
			Mpj.ctxs.iiif_p + "|" + 
			Mpj.ctxs.iiif_s + "|" + 
			Mpj.ctxs.iiif_i + 
			")(\\\d)/context"
		),
		check: function(context_noscheme){
			var version,
			shortctxt;
			if(context_noscheme.match(this.pat_iiif)){
				version = RegExp.$2;
				shortctxt = RegExp.$1;
			}else if(context_noscheme.match("^(" + Mpj.ctxs.iiif + "|" + Mpj.ctxs.scv + ")")){
				version = 2;
				shortctxt = RegExp.$1;
				if(context_noscheme === Mpj.ctxs.scv) console.log("Shared Canvas context", context_noscheme);
			}
			
			if(shortctxt){
				this.v = Number(version);
				this.set_prop(this.v, context_noscheme);
				return shortctxt;
			}else{
				return false;
			}
		},
		set_prop: function(ver, context_noscheme){
			if(ver > 3){
				throw new Error("Future IIIF version ?" + ver);
			}else if(ver < 2 || (ver > 2 && ver < 3)){
				ver = 2;
			}else if(!this.v) this.v = ver;
			Miiif.a = this.attrs["v" + ver];
			Miiif.v = this.vals["v" + ver];
			Miiif.use = true;
			Mut.str.set_prop("iiif");
		}
	},
	get_type: function(r){
		return r[this.a.type] ? (
			Mut.get_first(r[this.a.type]).replace(/^\w+:/, "") 
		) : undefined;
	},
	proc_manifest: function(def, tile, info){
		Mpj.set_ent_meta(def);
		Mpj.set_direction(def, "right-to-left");
		if(def.mode === "noshrink") Mia.opts.fit = false;
		if(Mia.opts.v.rpl) this.anno_repl = Mia.opts.v.rpl.split(' ');
		var annot = {}, type;
		if(def.mediaSequences){
			type = "ixif manifest";
			return this.proc_ixif_media(def, tile, info);
		}else if((type = this.get_type(def))){
			if(!type.match(/^[A-Z]/)){
				console.warn("First char of the type must be upper case:", type);
				type = Mut.str.uc_first(type);
			}
			switch(type){
			case "Manifest":
				annot = this.proc_manifest_items(def, tile, info);
				break;
			case "Collection":
				this.collection.proc(def);
				return "collection";
			case "Curation":
				this.proc_selections(Mia.jsource);
				return "curation";
			case "Annotation":
			case "AnnotationList":
				info.error = "This looks like " + type + " to be used with main manifest";
				break;
			case "Canvas":
				console.log("OK,", type, "as root object, rather than Manifest");
				if(def.structures) Mia.struct.data = def.structures;
				this.check_options(def);
				this.cvs.num = 1;
				var canvas = new Canvas(Mia, this);
				annot = canvas.proc(tile, def, info);
				break;
			default:
				this.set_error("Unknown IIIF type " + type, info);
			}
		}else if(
			(def.items && (def.items instanceof Array) && def.items.length)
			|| def.sequences
		){
			type = "Manifest";
			annot = this.proc_manifest_items(def, tile, info);
 		}else {
			info.error = "IIIF context, but no type nor sequence found.";
		}
		if(type) Mpj.type = type;
		return annot;
		
	},
	proc_manifest_items: function(def, tile, info){
		var annot;
		this.check_options(def);
		if(def.items){
			annot = seq_or_canvas("items", this);
		}else if(def.sequences){
			annot = this.proc_seq(def, tile, info, "sequences");
		}else if(def.content){
			annot = seq_or_canvas("content", this);
 		}else if(def.mediaSequences){
			Mpj.type = "ixif manifest";
			return this.proc_ixif_media(def, tile, info);
		}else{
			console.log(def);
			return this.set_error("No items/sequences in manifest", info);
		}
		if(def.structures) Mia.struct.data = def.structures;
		return annot;
		
		function seq_or_canvas(prop, that){
			if(def[prop][0].type === "Sequence"){
				return that.proc_seq(def, tile, info, prop);
			}else if(def[prop][0].type === "Canvas"){
				return that.proc_cvitems(def[prop], tile, info);
			}else if(def[prop][0].type === "AnnotationPage"){
				return that.proc_cvitems([def], tile, info);
			}else{
				console.log(def[prop][0]);
				return that.set_error("Not vald manifest items", info);
			}
		}
	},
	check_options: function(def){
		var bh = def[this.a.vhint], dvhint;
		if(bh instanceof Array) bh.forEach(function(b){check_one(b, this.hint);}, this);
		else if(bh) check_one(bh, this.hint);
		this.hint.view =  Mia.opts.v.vhint || dvhint;
		this.vinfo.view = [dvhint, this.hint.view];
		this.get_start_canvas(def);
		function check_one(val, hint){
			switch(val){
			case "paged":
			case "continuous":
			case "individuals":
				dvhint = val;
				break;
			case "auto-advance":
				hint.auto_advance = true;
				break;
			default:
				hint[val] = true;
			}
		}
	},
	proc_seq: function(def, tiles, info, prop){
		var sequences, first_sq, cvs;
		if(!(sequences = def[prop])){
			return test_noseq(def, tiles, info, this);
		}else if(sequences instanceof Array){
			if(sequences.length === 0) return this.set_error("No Sequence found in the list", info);
			else if(sequences.length > 1) console.warn("processing only the 1st Seqeuce (out of", sequences.length, ")");
			first_sq = sequences[0];
		}else{
			first_sq = sequences;
			sequences = false;
		}
		Mpj.set_direction(first_sq, "right-to-left");
		if(!this.hint.view) this.check_options(first_sq);
		this.get_start_canvas(first_sq);
		this.usedSeq = first_sq;
		if(!(cvs = first_sq.canvases) && !(cvs = first_sq.items)){
			if(typeof(first_sq) !== "object") return this.set_error("Not a valid Sequence", info);
			else return this.set_error(sequences === false ?
			"sequences value is not a list" :
			"canvases property not found in Sequence", info);
		}
		return this.proc_cvitems(cvs, tiles, info);
		
		
		function test_noseq(def, tiles, info, that){
			that.find_content_prop(def);
			if(that.vers.v >= 3 && def[that.a.content]){
				that.cvs.num = 1;
				console.warn("Container resource of '"+that.a.content+"' must have type Canvas, rather than", def.type);
				cvs = new Canvas(Mia, that);
				return cvs.proc(tiles, def, info);
			}else return that.set_error("sequences property not found", info);
		}

	},
	set_error: function(msg, info){
		console.warn(msg, "--> see stack trace to know where error occured");
		info.error = msg;
		info.error_reported = true;
		return false;
	},
	proc_cvitems: function(cvs, tiles, info){
		
		if(!(cvs instanceof Array)) return this.set_error("canvases property value must be a list", info);
		if((this.cvs.num = cvs.length) === 0) return this.set_error("No canvas found in the list", info);
		var annot = {}, cvanno;

		cvs.forEach(function(cv){
			var canvas = new Canvas(Mia, this);
			if((cvanno = canvas.proc(tiles, cv, info)))
			Mut.obj.merge(annot, cvanno);
		}, this);
		if(!this.cview.original) this.cview.original = {
			tiles: Mut.arr.copy(tiles),
			keyuris: Mut.arr.copy(Mia.keyuris)
		};
		this.cview.hint(this.hint.view, tiles, this.vinfo.dir[1]);
		return annot;
		
	},
	find_prop_used: function(object, propname){
		var used_prop = "";
		this.a[propname + "_arr"].forEach(function(p){
			if(object[p]){
				this.a[propname] = used_prop = p;
				return;
			}
		}, this);
		if(!used_prop) console.warn("used property not found in", object, "for", propname, ": candidates", this.a[propname + "_arr"]);
		return used_prop;
	},
	
	cview: {
		layer: null,
		paged: false,
		noannot: false,
		force_simple: false,
		dim_option: {"use_offset": true},
		saved: [], //key=mode, {"tiles": [], "keyuris": [], "tindex": null}
		original: null,
		nonpaged: [],
		MODE: {SINGLE: 0, MULTI: 1, SINGLE_DIR: 2, MULTI_DIR: 3},
		hint: function(vhint, tiles, dir){
			if(Mia.opts.dual || tiles.length <= 1) return;
			if(vhint === "continuous") this.set_continuous(tiles, dir);
			else if(vhint === "paged") this.set_paged(tiles);
		},
		set_continuous: function(tiles){
			this.switcher("continuous", tiles);//＠＠test→最後のlayer保存も確認
			var dir = Miiif.vinfo.dir[0] === "top-to-bottom" ? "v" : "h",
			cvuris = Miiif.cvs.ullist,
			baseci;
			if(Mia.env.rtl){
				baseci = Mia.cinfo[cvuris.pop()];
				cvuris = cvuris.reverse();
			}else{
				baseci = Mia.cinfo[cvuris.shift()];
			}
			var locarr = [0, 0, baseci.dim.x, baseci.dim.y],
			basedimx = baseci.dim.x;
			tiles.push(tiles.shift());
			baseci.layer = [this.set_layer(null, "base image", baseci, locarr)];
			cvuris.forEach(function(url){
				var ci =  Mia.cinfo[url];
				if(dir === "v"){
					locarr = [0, baseci.dim.y, ci.dim.x, ci.dim.y];
					baseci.dim.x = Math.max(ci.dim.x, baseci.dim.x);
					baseci.dim.y += ci.dim.y;
				}else{
					locarr = [baseci.dim.x, 0,  ci.dim.x, ci.dim.y];
					baseci.dim.x += ci.dim.x;
					baseci.dim.y = Math.max(ci.dim.y, baseci.dim.y);
				}
				var locx = Muib.tool.arr2viewportRect(locarr, basedimx);
				baseci.layer.push(this.set_layer(tiles.shift(), ci.label, ci, locarr, locx));
			}, this);
			Mia.const.nvzoom[0] /= Miiif.cvs.ullist.length;
			Mia.const.nvzoom[1] /= Miiif.cvs.ullist.length;
			if(dir === "v") Mia.opts.v.osd = {"navigatorHeight": 700, "navigatorWidth": 120};
			this.layer = baseci.layer;
			this.noannot = true;
			this.saved[0].layer = this.layer;
			Mia.layers.use_ctrl = false;
		},
		
		set_paged: function(tiles){
			this.switcher("paged", tiles);
			var cvuris = Miiif.cvs.ullist;
			if(Mia.env.rtl) tiles = tiles.reverse();
			for(var i=1, n = cvuris.length - 1; i<n; i++){
				var ci = Mia.cinfo[cvuris[i]];
				if(!ci.dim.x){
					console.warn("no width for paged view");
					continue;
				}
				if(check_non_paged(ci, i, true, this)) continue;
				var delta = 1,
				ci2 = Mia.cinfo[cvuris[i + delta]],
				loc1, loc2;
				if(!ci2.dim.x){
					console.warn("no width for paged view");
					continue;
				}
				while(check_non_paged(ci2, i + delta, false, this)){
					delta++;
					ci2 = Mia.cinfo[cvuris[i + delta]];
				}
				if(!ci2){
					console.warn("no more counter part canvas", i, delta, n);
					continue;
				}
				if(Mia.env.rtl){
					loc1 = Muib.tool.arr2viewportRect([ci2.dim.x, 0, ci.dim.x, ci.dim.y], ci.dim.x),
					loc2 = Muib.tool.arr2viewportRect([0, 0, ci2.dim.x, ci2.dim.y], ci.dim.x);
				}else{
					loc1 = Muib.tool.arr2viewportRect([0, 0, ci.dim.x, ci.dim.y], ci.dim.x),
					loc2 = Muib.tool.arr2viewportRect([ci.dim.x, 0, ci2.dim.x, ci2.dim.y], ci.dim.x);
				}
				loc2.normHeight = ci2.dim.y / ci2.dim.x;
				ci.layer = set_paired_layers(i, delta, tiles, ci, ci2, loc1, loc2, this);
				if(ci2.label) ci.label_paged = 
					ci.label.match(/^(im|p)age/i) && ci2.label.match(/^(im|p)age (.*)/i) ?
					RegExp.$2 : ci2.label;
				if(ci2.description) ci.description_paged = ci2.description;
				
				ci.pagedcv = cvuris[i+delta];
				ci2.pagedref = cvuris[i];
				i += delta;
				Mia.keyuris[i] = null;	
				tiles[i] = null;
			}
			for(var n=tiles.length, i=n-1; i>=0; i--){
				if(tiles[i] === null){
					Mia.keyuris.splice(i, 1);
					tiles.splice(i, 1);
				}
			}
			if(Mia.env.rtl) tiles = tiles.reverse();
			this.paged = true;
			Mia.layers.use_ctrl = false;
			if(this.nonpaged.length) console.log(this.nonpaged.length + " non-paged canvas");
			
			
			function set_paired_layers(i, delta, tiles, ci, ci2, loc1, loc2, that){
				ci.center = {x: (loc1.width + loc2.width) / 2, y: loc1.height / 2};
				if(Mia.env.rtl) ci.offstx = loc2.width;
				else ci2.offstx = loc1.width;
				if(!tiles[i+delta]){
					console.warn("no tile", i, delta, ci);
					return null;
				}
				var mkpagelayer = that.tile_add_fb(tiles[i+delta], loc2);
				if(mkpagelayer.width && mkpagelayer.height) delete mkpagelayer.height;
				tiles[i] = add_tile_props(tiles[i], {
					fitBounds: loc1,
					mkpagelayer: mkpagelayer, 
					mkcenter: ci.center
				});
				return [
					that.set_layer(null, "base image", ci, null, loc1),
					that.set_layer(tiles[i+delta], ci2.label, ci2, null, loc2)
				];
			}
			function add_tile_props(tile, propval){
				if(typeof(tile)==="string") tile = {"tileSource": tile};
				for(var p in propval) tile[p] = propval[p];
				return tile;
			}
			
			function check_non_paged(cinf, j, check_facing, that){
				if(!cinf){
					console.log(cinf, j, that);
				}else if(cinf.vhint){
					if(cinf.vhint === "non-paged"){
						Mia.keyuris[j] = null;	
						tiles[j] = null;
						that.nonpaged.push(Miiif.cvs.ullist[j]);
						return true;
					}else if(check_facing && cinf.vhint === "facing-pages"){
						return true;
					}
				}
				return false;
			}
			
		},
		append_paged_val: function(uri, type){
			if(!this.paged) return "";
			var ci = Mia.cinfo[uri], prop = type + "_paged";
			return ci[prop] ? "; " + ci[prop] : "";
		},
		set_layer: function(tile, label, ci, locarr, loc){
			if(!loc) loc = Muib.tool.arr2viewportRect(locarr, ci.dim.x);
			return {
				tile: tile ? this.tile_add_fb(tile, loc): null,
				tid: ci.tid,
				label: label,
				level: 2,
				loc: loc
			};
		},
		tile_add_fb: function(tile, loc){
			if(typeof(tile)==="string") tile = {"tileSource": tile, "fitBounds": loc};
			else{
				tile.fitBounds = loc;
				if(!tile.tileSource){
					if(tile.url) tile.tileSource = {"url": tile.url, "type": tile.type};
					else if(tile[Miiif.a.id]) tile.tileSource = tile[Miiif.a.id]+"/info.json";
					else console.warn("No tileSource FB", tile);
				}
			}
			return tile;
		},
		p2pv: function(p, pv){
			var cvid, pos;
			if(p){
				cvid = Miiif.cvs.ullist[p - 1];
				pos = Mia.keyuris.indexOf(cvid);
				if(pos === -1){
					cvid = Miiif.cvs.ullist[p - 2];
					if((pos = Mia.keyuris.indexOf(cvid)) === -1){
						if(this.nonpaged.indexOf(cvid) > -1){
							console.log("Canvas", cvid, "marked as non-paged, not shown in paged mode");
							pos = -2;
						}
					}
				}
			}else{
				cvid = Mia.keyuris[pv - 1];
				pos = Miiif.cvs.ullist.indexOf(cvid);
				if(pos === -1){
					console.warn("not found ?",cvid);
				}
			}
			return pos;
		},
		
		sourcepos: function(){
			return this.paged ? Miiif.cvs.ullist.indexOf(Mia.key_uri()) : Muib.state.pos;
		},
		
		switcher: function(newmode, tiles, pos){
			var newidx = newmode === "indv" ? this.MODE.SINGLE : this.MODE.MULTI,
			saveidx = 1 - newidx;
			if(tiles){
				if(!this.saved[this.MODE.SINGLE]) this.saved[this.MODE.SINGLE] = {
					tiles: OpenSeadragon.extend(true, [], tiles),
					keyuris: OpenSeadragon.extend(true, [], Mia.keyuris)
				};
			}else{
				prepare_new_startpage(this, pos);
				if(!this.saved[saveidx]){
					if(saveidx === this.MODE.MULTI) this.saved[saveidx] = this.get_current();
					else get_new_hint(newmode, this);
				}
				if(newidx === this.MODE.SINGLE){
					Muib.appb.set_msg("updating to individual mode...");
					this.layer = null;
					this.paged = false;
					this.force_simple = true;
					this.dim_option.use_offset = false;
				}else{
					Muib.appb.set_msg("updating to paged mode...");
					if(this.saved[saveidx].layer) this.layer = this.saved[saveidx].layer;
					else this.paged = true;
					this.force_simple = false;
					this.dim_option.use_offset = true;
				}
				Mia.keyuris = this.saved[newidx].keyuris;
				this.reset(this.saved[newidx].tiles);
			}
			
			function prepare_new_startpage(that, pos){
				var set_var, clear_var, newpos;
				if(that.paged){
					set_var = "page";
					clear_var = "pv";
					newpos = pos || that.p2pv(null, Muib.state.pos + 1);
				}else{
					set_var = "page";
					clear_var = "pv";
					newpos = Muib.state.pos + 1;
				}
				Mia.opts.v[set_var] = newpos + 1;
				Mia.opts.v[clear_var] = null;
			}
			function get_new_hint(mode, that){
				if(newmode === "paged") Mia.opts.v.vhint = "paged";
				var tile = OpenSeadragon.extend(true, [], Mia.osdv.viewer.tileSources);
				that.hint(newmode, tile, Miiif.vinfo.dir[1]);
				that.saved[that.MODE.MULTI] = {
					tiles: tile,
					keyuris: OpenSeadragon.extend(true, [], Mia.keyuris)
				};
			}
		},
		get_current: function(){
			return {
				tiles: OpenSeadragon.extend(true, [], Mia.osdv.viewer.tileSources),
				keyuris: OpenSeadragon.extend(true, [], Mia.keyuris)
			};
		},
		reset: function(tiles){
			Mia.osdv.viewer.destroy();
			Mut.dom.append(Mia.elt.osdv, Mia.elt.msg);
			Mut.dom.append(Mia.elt.osdv, Mia.elt.jldarea);
			if(Mia.elt.gallery) Mut.dom.append(Mia.elt.osdv, Mia.elt.gallery);
			if(Manno.current.length) Manno.save_current(Mia.env.keyuri);
			Manno.total = 0;
			Mwa.antrs.reset();
			Mia.env.keyuri = null;
			Mia.layers.last_loaded = null;
			Mia.env.loaded_uri = null;
			Muib.state.loading = true;
			Mia.setup_done = false;
			Mia.tindex.state.setdone = false;
			Mia.tindex.list = [];
			Mia.elt.tindex.innerHTML = "";
			Mia.tindex.ppos.innerHTML = "";
			if(Mia.struct.data) Mia.struct.refresh();
			Mia.filter.reset_all();
			Mia.init(tiles, Mia.oa, null, "image");
		},
		switch_dir: function(dir){
			Mia.env.rtl = dir === "rtl" ? true: false;
			Mia.keyuris = Mut.arr.copy(this.original.keyuris);
			var tiles = Mut.arr.copy(this.original.tiles, Mia.env.rtl ^ Mia.env.original_rtl);
			this.saved = [];
			
			var page = Muib.state.pos + 1;
			Mia.opts.v.page = this.paged ? this.p2pv(null, page + 1) + 1 : page;
			this.hint(this.paged ? "paged" : "indiv", tiles, dir);
			this.reset(tiles);
		},
		is_simple: function(){
			return !this.paged && !this.noannot;
		}
	},
	
	
	proc_embed: function (def, res, idx){
		Muib.appb.set_status("wait");
		Muib.appb.set_msg("proc embed...", "normal");
		var annot = {};
		if(def["resources"]){
			res.count += proc_resources(def["resources"], annot, this);
		}else if(def instanceof Array){
			if(def[0]["resources"]){
				for(var i=0,n=def.length; i<n; i++) 
				res.count += proc_resources(def[i]["resources"], annot, this);
			}else if(def[0]["resource"]){
				for(var i=0,n=def.length; i<n; i++) 
				res.count += this.proc_one_embed(def[i], annot, idx);
			}
		}else if(def["resource"]){
			res.count += proc_resources(def, annot, this);
		}
		return annot;

		function proc_resources(defrs, annot, that){
			var rescount = 0;
			if(defrs instanceof Array){
				defrs.forEach(function(rs){
					rescount += that.proc_one_embed(rs, annot, idx);
				}, that);
			}else{
				rescount += that.proc_one_embed(defrs, annot, idx);
			}
			return rescount;
		}
	},
	proc_one_embed: function(rs, annot, idx, cvinst){
		var val, tg = rs[this.a.target], body, bb = rs[this.a.body];
		if(bb === undefined){
			console.warn("no body", rs);
			return 0;
		}
		if(bb instanceof Array){
			for(var i=0,n=bb.length; i<n; i++){
				if((val = get_val_from_body(bb[i], rs, this))){
					body = bb[i];
					break;
				}
			};
		}else{
			body = bb;
			val = get_val_from_body(body, rs, this);
		}
		if(val === undefined) return 0;
		if(!(tg instanceof Array)) tg = [tg];
		var count = 0;
		tg.forEach(function(tt){
			var tgparts = Mut.frag.parse_obj(tt);
			if(tgparts[3]){
				var surl = tgparts.shift(),
				frag = tgparts.pop(),
				id = body[this.a.id];
				
				if(cvinst && surl !== cvinst.cvuri && this.anno_repl){
					surl = (id && id.match(/^http/)) ?
					id.replace(this.anno_repl[0], this.anno_repl[1]) : 
					surl.replace(this.anno_repl[0], this.anno_repl[1]);
					if(frag === "xywh=0,0,0,0") frag = "xywh=" + (this.anno_repl[2] || "0,50,50,50");
				}else if(frag === "xywh=0,0,0,0"){
					this.canvas.cinfo.description = val;
					return;
				}
				if((Mia.opts.v.tp || (cvinst && cvinst.duration))
					&& typeof(rs.motivation)==="string"
					&& rs.motivation.match(/(paint|highlight)ing$/) 
					&& !Miiif.searchs.req
				){
					Mut.obj.prepare(Mia.defer[RegExp.$1], idx);
					set_annot(Mia.defer[RegExp.$1][idx], surl, id, val, body, frag, rs.motivation, tgparts);
				}else{
					set_annot(annot, surl, id, val, body, frag, rs.motivation);
				}
				count++;
			}else{
				var schm_indep_uri = Mut.scheme.arr_exists_another(Object.keys(Mia.cinfo), tgparts[0], true);
				if(schm_indep_uri){
					var loc = "100,100,200,100", frag = "xywh="+loc;
					if(Miiif.searchs.req){
						set_annot(annot, schm_indep_uri, id, val, body, frag, rs.motivation, [loc, tgparts[2]]);
					}else if(rs.motivation.match(/(paint|highlight)ing$/)){
						Mut.obj.prepare(Mia.defer[RegExp.$1], idx);
						set_annot(Mia.defer[RegExp.$1][idx], schm_indep_uri, id, val, body, frag, rs.motivation, [loc, tgparts[2]]);
					}else{
						Mia.cinfo[schm_indep_uri].description = "✍" + Mut.html.safe_text(val);
					}
					count++;
				}else{
					console.warn("Unknown (no cinfo) target", tt, tgparts, "for", rs);
				}
			}
		}, this);
		return count;
		
		function get_val_from_body(body, rs, that){
			var type = that.get_type(body), style, val;
			if(type === "SpecificResource"){
				if(rs.stylesheet) style = get_style(rs.stylesheet, body.style);
				body = body.full;
				type = that.get_type(body);
			}
			switch(type){
			case "ContentAsText":
			case "Text":
				val = (typeof(body.chars) !== "undefined") ? body.chars :
				"(" + (body[that.a.id] ? (
					tg.match(/#xywh/) ? 
					"[external resource](" + body[that.a.id] + ")" :
					"<a href=\"" + body[that.a.id] + "\">external resource</a>"
				) : "empty string") +")" ; 
				if(style){
					val = "<div style=\"" + style + "\">" + val + "</div>";
					body.format = "text/html";	
				}
				break;
			case "TextualBody":
				val = body.value;
				break;
			case "Image":
				val = (body.label || "") + "![--](" + body[that.a.id] + ")";
				body.format = "";
				break;
			default:
				console.warn("unknown type", type, body[that.a.type]);
			}
			return val;
		}
		
		function set_annot(tgannot, surl, id, val, body, frag, motivation, tgp){
			var oa = {
				type: "cnt:ContextAsText",
				id: id,
				body: {
					value: val,
					format: body.format || (body.full ? body.full.format : "text/plain")
				},
				target: {
					source: surl,
					selector: {value : frag}
				}
			};
			if(motivation) oa.motivation = motivation;
			if(tgp){
				oa.loc = tgp[0];
				oa.trange = tgp[1];
			}
			Mut.arr.add(tgannot, surl, oa);
		}
		
		function get_style(styleDef, bodyst){
			if(styleDef.chars && bodyst){
				var m = styleDef.chars.match(/^\.([\w\d-]+)\s*{(.*?)}/);
				if(m && m[1]===bodyst) return m[2];
			}
			return null;
		}
	},

	add_other_content: function (uri){
		Muib.appb.set_status("wait");
		Muib.appb.set_msg("other content...");
		var othercon = Mut.obj.copy(Mia.cinfo[uri].other),
		uri_b,
		finidx = othercon.length - 1,
		oacount = 0;
		Mia.cinfo[uri].other = null;
		
		othercon.forEach(function(othuri, i){
			var oa = {},
			annot = {};
			OpenSeadragon.makeAjaxRequest({
				"url": othuri,
				"success": function(xhr) {
					Mpj.get_more_annot(xhr.response, oa, i+1);
					if((uri_b = Mut.scheme.exists_another(oa, uri, true))){
						if(uri !== uri_b){
							oa[uri] = oa[uri_b];
							delete(oa[uri_b]);
						}
						merge_annot(annot, oa, uri, uri, i);
					}else if(oa[Mia.cinfo[uri].mediaurl]){
						merge_annot(annot, oa, uri, Mia.cinfo[uri].mediaurl, i);
					}else if(Object.keys(oa).length){
						for(var u in oa) Manno.strange[u] = oa[u];
						if(Mia.opts.v.strange) Manno.test_strange();
					}else if(Mia.defer.paint[i+1] || Mia.defer.highlight[i+1]){
						merge_tp(oa, uri, i);
					}else{
					}
					Muib.update_page.imgdesc(uri);
					Muib.appb.set_status("auto");
				},
				"error": function(e){
					console.error(e);
					Muib.appb.set_status("auto");
					Mia.tindex.set_data_an_attr(0);
				}
			});
		});

		function merge_annot(annot, oa, keyuri, tguri, curidx){
			if(Mav.type){
				Mavannot.resolve_deferred(oa, curidx + 1);
				Mavannot.do_setup(oa, keyuri);
				if(Mav.type === "audio") Mau.set_audio_msg();
				else Muib.appb.set_msg("merging annot done");
			}else{
				var page = Miiif.cview.paged ? (
					Mia.keyuris.indexOf(tguri) >= 0 ? tguri : Mia.cinfo[tguri].pagedref
				) : tguri;
				Mut.arr.append(Mia.oa, tguri, oa[tguri]);
				Manno.oa2annotorious(annot, oa, tguri, Manno.frags, page);
				Mut.arr.append(Manno.page, page, annot[page]);
				oacount += annot[page].length;
				oacount += Manno.resolve_deferred(curidx+1);
				test_complete(page, curidx);
			}
			Mut.str.set_prop("iiif");
		}
		function merge_tp(oa, keyuri, curidx){
			if(Mav.type){
				Mavannot.do_setup(oa, keyuri, curidx+1);
			}else{
				oacount += Manno.resolve_deferred(curidx+1);
				test_complete(keyuri, curidx);
			}
		}
		function test_complete(keyuri, curidx){
			if(curidx === finidx){
				if(oacount){
					Manno.flush(keyuri);
					Manno.counter.update(oacount - 1, true);
				}
				if(Mia.cinfo[uri].overlay) Manno.flush_overlay(keyuri);
			}
		}
	},
	get_start_canvas: function(def){
		if(def[this.a.start] && !Mia.opts.v.canvas){
			var cvid = Mut.obj.get_oneuri(def[this.a.start]),
			pu = Mut.frag.parse_uri(cvid);
			Mia.opts.v.canvas = pu[0];
			if(pu[2] && !Mia.opts.v.t) Mia.opts.v.t = pu[2];
		}
	},

	full2mid: function (url, width, range){
		if(url.match(/^(.+\/)full\/(full|max)\/([^\/]+\/[^\/]+)$/)){
			url = RegExp.$1 + (range || "full") + "/" + (width || 1000) +",/" + RegExp.$3;
		}
		return url;
	},
	
	
	collection:{
		mdef: null,
		opend: [],
		closed: false,
		fldrid: 0,
		nested: 0,
		member_prop: null,
		
		proc: function(def){
			this.mdef = def;
			var div = Mut.dom.elt("div");
			Mia.ent.label = def.label ? Mut.str.lang_val(def.label) : "IIIF Manifest Collection";
			this.member_prop = def.items ? "items" : (def.members ? "members" : Miiif.a.coll_item);
			["description", "attribution"].forEach(function(fld){
				if(def[fld]) Mut.dom.append(div, Mut.dom.append(
					Mut.dom.elt("div"), 
					[Mut.dom.elt("dfn", fld), Mut.dom.ashtml(": " + 
						Mut.html.fold_text(Mut.html.safe_text(Mut.str.lang_val(def[fld]), "xlong"))
					)]
				));
			});
			if(Mia.opts.v.mode && Mia.opts.v.mode.substr(0,3) === "tbl"){
				this.simple_table(def, div, Mia.opts.v.mode.substr(3));
				this.sate.check(false);
			}else if(def.vhint === "use-thumb"){
				document.body.style.paddingRight = "5px";
				document.body.style.maxWidth = "none";
				this.thumb_box(def, div);
				this.sate.check(false);
			}else{
				this.closed = (def.collapse && def.collapse===true) || this.num_children(def) >= 10 ?  true : false;
				this.opened = this.sate.check(true);
				this.fldrid = 0;
				this.list_items(def, div);
				if(this.nested > 3) Mia.elt.maindiv.insertBefore(switcher(), Mia.elt.maindiv.firstChild);
			}
			Mia.elt.maindiv.replaceChild(div, Mia.elt.osdv);
			Muib.appb.set_h1("collection", true);
			Muib.clip.showctrl(false);
			window.onscroll = function(){Miiif.collection.sate.save_pos();};
			var toScroll = this.sate.toScroll;
			if(toScroll){
				if(document.scrollingElement) document.scrollingElement.scrollTop = toScroll;
				else document.body.scrollTop = toScroll;
				this.sate.toScroll = null;
			}
			return "collection";
			
			function switcher(){
				var sdiv = Mut.dom.elt("div", "", [["class", "sideitem"]]),
				btn1 = Mut.dom.elt("button", "collapse all"),
				btn2 = Mut.dom.elt("button", "expand all");
				btn1.onclick = function(){Miiif.collection.toggle_lis(false);};
				btn2.onclick = function(){Miiif.collection.toggle_lis(true);};
				Mut.dom.append(sdiv, [btn1, " ", btn2]);
				return sdiv;
			}
			
		},
		list_items: function(def, pnode, len){
			var pul = Mut.dom.elt("ul"), found = false;
			pul.className = "collection" + (len && len > 20 ? " mu" : "");
			if(def.collections){
				this.list_collections(def.collections, pul);
				found = true;
			}
			if(def.manifests){
				this.list_manifests(def.manifests, pul, false);
				found = true;
			}
			if(def[this.member_prop]){
				this.proc_members(def[this.member_prop], pul);
				found = true;
			}
			if(!found){
				console.log(def);
				pul = Mut.dom.elt("p", "Unknown format");
			}
			Mut.dom.append(pnode, pul);
		},
		list_collections: function (cols, pul){
			cols.forEach(function(col){
				this.proc_one_collection(col, pul);
			}, this);
		},
		proc_one_collection: function (col, pul){
			var li, len = this.num_children(col);
			if(len){
				li = this.prep_folder(
					Mut.str.lang_val(col.label) + "(" + len + ")", 
					(this.opened[this.fldrid]===undefined ? this.closed : this.opened[this.fldrid]!=="true"),
					"ul"
				);
				li.setAttribute("data-fldr", this.fldrid++);
				if(col.description) Mut.dom.append(li, Mut.dom.append(Mut.dom.elt("div", "", [["class", "descr"]]), Mut.dom.ashtml(col.description)));
				this.list_items(col, li, len);
				this.nested++;
			}else{
				li = this.gen_one_li(col);
			}
			Mut.dom.append(pul, li);
		},
		prep_folder: function(label, is_opener, checker){
			var pli = Mut.dom.elt("li");
			var toggler = Mut.dom.elt("span", label);
			Mut.dom.append(pli, toggler);
			pli.className = "range" + (is_opener ? "" : " openf");
			toggler.className = is_opener ? "opener" : "closer";
			toggler.onclick = function(){Muib.tool.toggleobj(this, checker);};
			return pli;
		},
		toggle_lis: function(to_open){
			var rli = Mut.dom.get("range", "class");
			for(var i=0,n=rli.length; i<n; i++){
				Muib.tool.toggleobj(rli[i].firstChild, "ul", to_open);
			}
		},
		list_manifests: function (mans, pul, uselabel){
			mans.forEach(function(man){
				Mut.dom.append(pul, this.gen_one_li(man));
			}, this);
		},
		proc_members: function (membs, pul){
			membs.forEach(function(memb){
				if(memb[Miiif.a.type] === Miiif.v.collection){
					this.proc_one_collection(memb, pul);
				}else{
					Mut.dom.append(pul, this.gen_one_li(memb));
				}
			}, this);
		},
		gen_one_li: function (item){
			var li = this.one_item_elt("li", item);
			if(item.description){
				Mut.dom.append(li, Mut.dom.append(Mut.dom.elt("span", "", [["class", "descr"]]), Mut.dom.ashtml(" - " + Mut.html.safe_text(item.description))));
			}
			if(item.thumbnail) Mut.dom.append(li, [" ", Mut.dom.elt(
				"span", "☺", [
					["class", "pseudolink"],
					["onclick", "Miiif.collection.showthumb(this, \"" + Mut.obj.get_oneuri(item.thumbnail) + "\")"]
				]
			)]);
			return li;
		},
		one_item_elt: function (eltname, item){
			var elt = Mut.dom.elt(eltname), label,
			link = this.get_ap_link(item, Miiif.a.id),
			ap = link[0], qv = link[1], uri = link[2];
			if(item[Miiif.a.type] === Miiif.v.collection) elt.className="collection";
			if(item.label){
				label = Mut.str.lang_val(item.label);
			}else{
				var path = uri.split("/");
				path.pop();
				label = path.pop();
			}
			if(uri){
				var link = Mut.dom.elt("a", label, [["href", ap + qv + uri]]);
				Mut.dom.append(elt, link);
			}else{
				Mut.dom.append(elt, label);
			}
			return elt;
		},
		get_ap_link: function (item, idattr){
			var ap = "image-annotator",
			qv = "?" + (item.qpvar || "u") + "=",
			id = item[idattr] || item.id,
			uri = id ? Mut.uri.resolve_partial(id) + 
			(item.qparam ?  "&" + item.qparam : "") +
			(this.mdef.qparam ?  "&" + this.mdef.qparam : "") +
			((item.fragment || item.frag) ? "#" + (item.fragment || item.frag) : "") :
			"";
			return [ap, qv, uri];
		},
		num_children: function (item){
			var c = item.manifests || item.collections || item[this.member_prop];
			return c ? c.length : c;
		},
		simple_table: function (def, pnode, mode){
			var tbl = Mut.dom.elt("table", "", [["class", "collection"]]),
			th = Mut.dom.elt("thead"),
			tr = Mut.dom.elt("tr"),
			dp = def["disp props"] ? def["disp props"].split(";") : null,
			alt = def["alternative"] || null,
			thp = ["Manifest w/ Image Annotator", "Description"];
			if(dp) thp = thp.concat(dp);
			thp.forEach(function(h){Mut.dom.append(tr, Mut.dom.elt("th", h));});
			th.appendChild(tr);
			tbl.appendChild(th);
			def.manifests.forEach(function (item){
				var tr = Mut.dom.elt("tr"), descr = Mut.dom.elt("td");
				if(item.description) descr.innerHTML = Mut.html.safe_text(item.description);
				var manlink = this.one_item_elt("td", item);
				if(item[alt]){
					var span = Mut.dom.elt("span", "", [["class", "alt"]]);
					Mut.dom.append(span, Mut.dom.elt("a", alt, [["href", (this.get_ap_link(item, alt)).join("")]]));
					Mut.dom.append(manlink, span);
				}
				Mut.dom.append(tr, [
					manlink,
					descr
				]);
				if(dp) dp.forEach(function(p){Mut.dom.append(tr, Mut.dom.elt("td", Mut.str.lang_val(item[p])));});
				tbl.appendChild(tr);
			}, this);
			pnode.appendChild(tbl);

		},
		thumb_box: function(def, pnode){
			var fbox = Mut.dom.elt("div","",[["class", "fbox"]]), fbhtml = "";
			def.manifests.forEach(function(man){
				fbhtml += "<figure>" +
				"<a href=\"?u=" + man[Miiif.a.id] + (man.qparam ? "&"+man.qparam : "") +
				(man.frag ? "#" + man.frag : "") + "\">" +
				"<img src=\"" + Mut.obj.get_oneuri(man.thumbnail) + "\"/></a>"+
				"<figcaption><strong>" + man.label + "</strong>: " + 
				(man.description ? Mut.html.fold_text(man.description, "slong") : "") +
				(man.related ? " (<a href=\""+man.related+"\">related</a>)" : "") +
				"</figcaption></figure>\n";
			});
			fbox.innerHTML = fbhtml;
			pnode.appendChild(fbox);
		},
		showthumb: function(o, thumburi){
			if(!Mia.elt.thumbox){
				var thumbox = Mut.dom.elt("img");
				thumbox.className = "thumb";
				thumbox.onclick = function(){Miiif.collection.showthumb(this.previousSibling);};
				Mia.elt.thumbox = thumbox;
			}
			if(!thumburi || o.nextSibling === Mia.elt.thumbox){
				o.parentNode.removeChild(Mia.elt.thumbox);
				o.style.background = "transparent";
			}else{
				Mia.elt.thumbox.setAttribute("src", thumburi);
				o.parentNode.appendChild(Mia.elt.thumbox);
				if(Muib.state.colthumb)
				Muib.state.colthumb.style.background = "transparent";
				o.style.background = "#ffa";
				Muib.state.colthumb = o;
			}
		},
		sate: {
			openlist: [],
			toScroll: null,
			set: function(fldrid, isopen){
				this.openlist[fldrid] = isopen;
				document.cookie = "coluri=" + Mia.opts.v.u;
				document.cookie = "openids=" + this.openlist.join(".");
				document.cookie = "path=" + location.pathname;
			},
			check: function(checkopen){
				var m = document.cookie.match(/coluri=([^;]+)/);
				if(m && m[1]===Mia.opts.v.u){
					m = document.cookie.match(/scrlpos=([^;]+)/);
					if(m && m[1]){
						this.toScroll = Number(m[1]);
					}
					if(!checkopen) return;
					m = document.cookie.match(/openids=([^;]+)/);
					if(m && m[1]){
						this.openlist = m[1].split(".");
						return this.openlist;
					}
					else return [];
				}else{
					document.cookie = "coluri=;max-age=0";
					return [];
				}
			},
			save_pos: function(){
				document.cookie = "coluri=" + Mia.opts.v.u;
				document.cookie = "scrlpos=" + (document.scrollingElement ? document.scrollingElement.scrollTop : document.body.scrollTop);
			}
		}
	},
	
	proc_selections: function(def){
		this.use = true;
		this.curation = true;
		var n = def.selections.length,
		selres=[],
		selcount = 0,
		Cv_done = [],
		lastman = null,
		Anno = {},
		that = this;
		Mia.struct.data = [];
		Mia.ent.label = def.label;
		def.selections.forEach(function(sel, i){
			OpenSeadragon.makeAjaxRequest({
				"url": Mut.obj.get_oneuri(sel.within),
				"success": function(xhr) {
					selres[i] = proc_selcv(Mpj.parse_json(xhr.response), sel);
				},
				"error": function(e){
					Muib.appb.set_status("auto");
					Muib.appb.set_msg("JSON file load error. "+ e.status+":"+e.statusText, "error");
					selres[i] = null;
				}
			});
		});
		var sid = setInterval(function(){
			if(selres.length >= n){
				integrate();
				clearInterval(sid);
			}else if(selcount++ > 100){
				console.warn("selection nest too much", selcount);
				clearInterval(sid);
			}
		}, 200);
		
		function integrate(count){
			var tiles = [];
			selres.forEach(function(res){
				if(res){
					tiles = tiles.concat(res.tiles);
					Mia.struct.data.push(res.struct);
				}
			});
			Mia.keyuris = [];
			tiles.forEach(function(t){
				Mut.arr.uniq_push(Mia.keyuris, that.tilemap[t]);
			});
			if(Mia.ent.label) Muib.meta.add(def);
			else{
				Mpj.type = "Curation";
				Mia.ent.label = lastman.label;
				Mia.ent.description = lastman.description;
				Muib.meta.add(lastman);
			}
			Mia.init(tiles, Anno);
			Mia.elt.imgdsc.classList.add("curation");
		}
		function proc_selcv(manifest, sel){
			lastman = manifest;
			var tg = [],
			res = {
				tiles: [],
				struct: null
			},
			meta = manifest.metadata,
			rel = manifest.related;
			if(!meta){
				meta = [{"label": "Manifest label", "value": manifest.label}];
				if(manifest.description) meta.push({"label": "Manifest description", "value": manifest.description});
			}
			if(sel.canvases) sel.canvases.forEach(function(c, i){register_canvas(c, i, tg, sel.label);});
			if(sel.members) sel.members.forEach(function(c, i){register_canvas(c, i, tg, sel.label);});
			Mut.get_first(manifest.sequences).canvases.forEach(function(cv){
				var id = cv[Miiif.a.id];
				if(tg.indexOf(id) >= 0 &&
					Cv_done.indexOf(id) === -1
				){
					if(!cv.metadata) cv.metadata = meta;
					if(!cv.within) cv.within = sel.within;
					if(!cv.related && rel) cv.related = rel;
					var canvas = new Canvas(Mia, that);
					canvas.proc(res.tiles, cv, {});
					Cv_done.push(id);
				}
			});
			if(Mia.opts.v.raw){
				res.struct = sel;
				res.struct.label = manifest.label;
			}else res.struct = {
				"@type": "sc:Range",
				"@id": sel[Miiif.a.id],
				"label": manifest.label,
				"canvases" : tg
			};
			
			return res;
		}
		function register_canvas(canv, i, tg, slabel){
			var tgid = Mut.obj.get_oneuri(canv),
			bf = Mut.frag.parse_uri(tgid);
			if(bf[3] && !Mia.opts.v.raw){
				i++;
				if(slabel) slabel += " " + i;
				add_annotation(bf[0], bf[3], canv.label || slabel || "Curation " + i);
			}
			if(tg.indexOf(bf[0]) === -1) tg.push(bf[0]);
		}
		function add_annotation(base, frag, label){
			if(!Anno[base]) Anno[base] = [];
			Anno[base].push({
				"type" : "Annotation",
				"id": base+frag,
				"body": {"value": label},
				"target" : {
					"source" : base, 
					"selector" : {"value" : frag} 
				}
			});
		}
	},
	
	searchs: {
		elt: null,
		last_kwd: "",
		has_result: false,
		service_uri: null,
		reset_li: null,
		req: false,
		setup_done: false,
		setup: function(s){
			if(this.setup_done) return;
			this.setup_done = true;
			Mia.opts.v.foc = false;
			var searchuri = s[Miiif.a.id],
			slabel = s.label || "search within content",
			form = Mut.dom.elt("form");
			this.service_uri = searchuri;
			form.addEventListener("submit",function(e){
				e.stopPropagation();
				e.preventDefault();
				Miiif.searchs.request(e.target.elements.kwd.value);
			},false);
			form.style.display = "inline-block";
			Mut.dom.append(form, [
				slabel + ": ",
				Mut.dom.elt("input","", [["type", "text"], ["name", "kwd"]]),
				Mut.dom.elt("input","", [["type", "submit"], ["value", "Search"]])
			]);
			Mut.dom.append(Mia.elt.jldctrl, form);
			this.reset_li = Mut.dom.elt("li", "reset search", [["class", "reset"]]);
			this.reset_li.onclick = function(){Miiif.searchs.request("");};
		},
		request: function(kwd){
			var Keyword = kwd.toLowerCase();
			if(Keyword === ""){
				if(Manno.saved && Manno.saved.__orgl) reset_search();
			}else if(Keyword === this.last_kwd){
			}else if(Manno.saved && Manno.saved[Keyword]){
				save_current_anno();
				Manno.page = OpenSeadragon.extend(true, {}, Manno.saved[Keyword]);
				present_anno(false);
			}else{
				var oa = {};
				this.req = true;
				OpenSeadragon.makeAjaxRequest({
					"url": this.service_uri + "?q=" + kwd,
					"success": function(xhr) {
						Mpj.get_more_annot(xhr.response, oa, 1);
						save_current_anno();
						setup_anno(oa);
						present_anno(false);
					},
					"error": function(e){
						console.error(e);
					}
				});
			}
			return false;
			
			function present_anno(is_reset){
				Miiif.searchs.has_result = !is_reset;
				Miiif.searchs.req = false;
				setup_tindex(is_reset);
				Miiif.searchs.last_kwd = Keyword;
				Manno.clear_current();
				if(Manno.page[Mia.env.keyuri]) Manno.flush(Mia.env.keyuri);
				var add_remove = is_reset ? "remove" : "add";
				Mia.osdv.elt.classList[add_remove]("searchres");
				Mia.elt.tindex.classList[add_remove]("searchres");
				Muib.appb.set_status("auto");
			}
			function save_current_anno(){
				if(! Manno.saved){
					Manno.saved = {"__orgl": OpenSeadragon.extend(true, {}, Manno.page)};
				}else if(!Manno.saved[Miiif.searchs.last_kwd]){
					Manno.saved[Miiif.searchs.last_kwd] = Manno.page;
				}
				Manno.page = {};
				Manno.total = 0;
			}
			function setup_anno(oa){
				var frags = {};
				for(var uri in oa) Manno.oa2annotorious(Manno.page, oa, uri, frags);
			}
			function setup_tindex(is_reset){
				Mia.elt.tindex.innerHTML = "";
				Mia.tindex.ppos.innerHTML = "";
				Mia.tindex.list = [];
				if(!Miiif.searchs.last_kwd){
					Miiif.searchs.saved_an = Mia.tindex.an;
					Mia.tindex.an = {"label": " occur", "pfx": "✑ "};
				}else if(is_reset){
					Mia.tindex.an = Miiif.searchs.saved_an;
				}
				if(is_reset){
					Mia.tindex.state.setdone = false;
					Mia.tindex.setup(Manno.page);
				} else gen_ul();
				Mia.tindex.update(null);
			}
			function gen_ul(){
				var ullist = Mut.dom.elt("ul"), li;
				if(Object.keys(Manno.page).length === 0)
				ullist.appendChild(Mut.dom.elt("li", "(not found)", [["class", "notfound"]]));
				Mia.keyuris.forEach(function(uri, i){
					if((li = Mia.tindex.set_li(i, uri, Manno.page))){
						if(Manno.page[uri]){
							li.innerHTML += " ("+Manno.page[uri].length +")";
							ullist.appendChild(li);
						}
						Mia.tindex.list.push(li);
					}
				});
				ullist.appendChild(Miiif.searchs.reset_li);
				Mia.tindex.init_vinfo(1, true);
				Mut.dom.append(Mia.elt.tindex, [ullist, Mia.tindex.ppos]);
				Muib.annobox.searchres();
			}
			function reset_search(){
				save_current_anno();
				Manno.page = OpenSeadragon.extend(true, {}, Manno.saved.__orgl);
				Miiif.searchs.last_kwd = "";
				present_anno(true);
				Muib.annobox.btn.style.display = "inline";
			}
		}
	},
	
	proc_parent_json: function(indx){
		this.vers.set_prop(2);
		var pa = window.parent;
		var selection = pa.curation[indx];
		Mia.opts.v.u = Mut.obj.get_oneuri(selection.within);
		this.proc_selections({"selections": [selection]});
	},
	proc_ixif_media: function(def, tile, info){
		var canvas = new Canvas(Mia, this);
		canvas.a.content = "elements";
		return canvas.proc(tile, def.mediaSequences[0], info);
	}

};

var OSDV = function(mia, id){
	this.mia = mia || {};
	this.elt = (mia && mia.elt && mia.elt.osdv) ? mia.elt.osdv : Mut.dom.elt("div", "", [["id", id]]);
	this.expand_ratio = 1;
	this.adjusted = false;
	if(mia){
		this.prp_tooltips();
		this.prepare(mia.osdtype);
		this.touchdev = mia.env.is_touch_dev;
		this.seqbtn_grp = [];
	}else{
		this.elt.className = "osdelt";
		this.msgbox = Mut.dom.elt("p", "", [["class", "msg"]]);
		this.elt.appendChild(this.msgbox);
		this.elt.msgbox = this.msgbox;
	}
};
	
OSDV.prototype = {
	init_viewer: function(osd_option){
		this.viewer = OpenSeadragon(osd_option);
		if(this.viewer.navigator){
			this.viewer.navigator.element.style.opacity = 0;
			this.viewer.navigator.element.style.zIndex = -1;
		}
		this.osdbr = OpenSeadragon.version.branch;
		this.container = this.elt.getElementsByClassName("openseadragon-container")[0];
	},
	prepare: function(type){
		if(!Muib.state.osdv_org_h) this.set_aspectr();
		if(this.elt.className) return;
		var cls = (type === "image") ? "view" : type,
		dest = (type === "audio") ? [111,161,192] : [0,0,0];
		Muib.appb.set_msg("", "normal");
		Muib.tool.step_bgcolor(this.elt, 100, [240,240,240], dest, 10);
		this.elt.className = cls;
		this.elt.addEventListener('drop', function(e) {
			e.stopPropagation();
			e.preventDefault();
			var manifest = e.dataTransfer.getData("Text");
			if(manifest.match(/^http/)){
				var mparm = manifest.match(/[\?&]manifest=(http[^\&]+)/);
				location = "?u=" + encodeURIComponent(mparm ? mparm[1] : manifest);
			}else console.log("non url drop", manifest);
		}, false);

		this.elt.addEventListener('dragover', function(e) {
		    e.preventDefault();
		});
	},
	prp_tooltips: function(){
		var is_ja;
		var set = {};
		if((is_ja = (this.mia.env.lang==="ja"))){
			set = {
				ZoomIn: "ズームイン",
				ZoomOut: "ズームアウト",
				FullPage: "全画面",
				RotateLeft: "左回転",
				RotateRight: "右回転",
				annotator: "注釈",
				PreviousPage: (this.mia.env.rtl ? "次のページ" : "前のページ"),
				NextPage: (this.mia.env.rtl ? "前のページ" : "次のページ")
			};
		}else if(this.mia.env.rtl){
			set = {
				PreviousPage: "Next page",
				NextPage: "Previous page"
			};
		}
		if(this.mia.opts.v.inf) set.FullPage = is_ja ? "この画像のみに" : "This image only";
		for(var btn in set){
			OpenSeadragon.setString("Tooltips."+btn, set[btn]);
		}

	},
	set_osd_handlers: function(){
		var mmia = this.mia, mviewer = this.viewer;
		this.viewer.addHandler("open", function(e){
			Muib.state.count.load_failed = 0;
			Muib.state.is_error = false;
			if(mmia.env.type === "image") mmia.proc_loaded(e);
		});
		this.viewer.addHandler("tile-loaded", function(e){
			if(mmia.env.type === "image"){
				if(mmia.env.loaded_uri !== mmia.key_uri()){
					mmia.env.loaded_uri = mmia.key_uri();
					e.tiledImage.addHandler("fully-loaded-change", function(e){
						if(Muib.state.loading){
							mmia.layers.fit_layer();
							if(Muib.state.loading_layer_id){
								console.log("moving layer to ", Muib.state.loading_layer_id);
							}else{
								Muib.appb.set_msg("done loaded");
								Muib.appb.msg.count = 0;
								Muib.state.loading = false;
							}
						}
					});
				}else if(Muib.state.loading_layer_id){
					if(e.tile.url.substr(0, Muib.state.loading_layer_id_len) === Muib.state.loading_layer_id){
						Muib.appb.set_msg("done load " + Muib.state.loading_layer_id);
						Muib.state.loading_layer_id = null;
					}
				}
			}else{
				mmia.proc_loaded(e);
			}
		});
		this.viewer.addHandler("tile-load-failed", function(e){
			Muib.appb.set_status("auto");
			var state = Muib.state;
			if(++state.count.load_failed >= e.tiledImage._tilesLoading){
				if(state.count.load_failed > 1)
				console.warn("Failed to load w/", state.count.load_failed, "errors", e);
				var ci = mmia.ci(),
				cls = ci && ci.layer ? "error layer" : "error";
				Muib.appb.set_msg("Failed to load tiles " + state.loadinfo[1], cls);
			}
		});
		this.viewer.addHandler("open-failed", function(e){
			console.warn("open failed", e);
			Muib.appb.set_status("auto");
			Muib.appb.set_msg(Mpj.test_support() || "Failed to open " + (
				Muib.state.loadinfo.length ? Muib.state.loadinfo[1] :
				Mut.uri.set_action_info("initial", mmia.key_uri())[1]
			), "error");
			Muib.state.is_error = true;
			if(mmia.tindex.clicktg) mmia.tindex.clicktg.className = "fail";
			if(!mmia.setup_done) mmia.proc_loaded(e);
		});
		this.viewer.addHandler("full-screen", function(e){
			if(mmia.opts.v.inf){
				var p = Muib.state.pos + 1;
				window.top.location = "?u=" + mmia.opts.v.u + (p > 1 ? "#p" + p : "");
			}else if(e.fullScreen) {
				document.body.classList.add("full");
			}else{
				document.body.classList.remove("full");
			}
		});
		this.viewer.addHandler("zoom", function(e){
			if(mviewer.navigator) if(e.zoom > mmia.const.nvzoom[0]) {
				if(! Muib.state.nvshown && !Muib.state.is_fading){
					Muib.tool.fadeio(mviewer.navigator.element, 400, 0, 1);
					Muib.state.nvshown = true;
				}
			}else if(Muib.state.nvshown && e.zoom < mmia.const.nvzoom[1] && !Muib.state.is_fading){
				Muib.tool.fadeio(mviewer.navigator.element, 600, 1, -1);
				Muib.state.nvshown = false;
			}
			if(mmia.opts.dual){
				if(e.refPoint && e.immediately !== false) window.parent.sync_zoom(mmia.opts.v.inf, e.zoom);
			}
		});
		this.viewer.addHandler("resize", function(e){
			if(mmia.tindex.state.behind) mmia.osdv.set_full(true);
			if(mmia.refstrip.vrs) mmia.refstrip.set_width();
			if(mmia.elt.gallery) mmia.gallery.set_width();
			mmia.opts.get_status();
		});
		this.viewer.addHandler("canvas-drag-end", function(e){
			if(mmia.env.numTiles > 1){
				var sperz = e.speed / mviewer.viewport.getZoom();
				if(sperz > mmia.env.flick_threshold)
				mviewer.goToPage( (e.direction > -1.57 && e.direction < 1.57 ? -1 : 1) + mviewer.currentPage());
			}
		});
		this.viewer.addHandler("page", function(e){
			if(Manno.clip_hilited){
				Manno.clip_hilited = false;
				Manno.pop_showing = 0;
			}
			Muib.appb.msg.count = 0;
		});
		if(this.mia.opts.dual) this.set_dualframe_handlers();
		
		
		
	},
	set_dualframe_handlers: function(){
		var mmia = this.mia, mviewer = this.viewer;
		this.viewer.addHandler("canvas-press", function(e){
			mmia.env.center = mviewer.viewport.getCenter();
		});
		this.viewer.addHandler("canvas-drag", function(e){
			var c = mviewer.viewport.getCenter();
			window.parent.sync_offset(mmia.opts.v.inf, {x: c.x - mmia.env.center.x, y: c.y - mmia.env.center.y});
			mmia.env.center = c;
		});
		this.viewer.addHandler("page", function(e){
			if(window.parent.initiator){
				window.parent.initiator = null;
			}else{
				window.parent.sync_page(mmia.opts.v.inf, mmia.get_pos(e.page), mmia.env.numTiles, mmia.env.syncpage);
			}
			mmia.env.syncpage = mmia.get_pos(e.page);
		});
	},
	goTo: function(tgpos, page){
		if(Miiif.cview.layer){
			var loc = Miiif.cview.layer[tgpos].loc;
			if(page === undefined) page = this.mia.get_pos(tgpos);
			this.viewer.viewport.panTo({x:loc.x+loc.width/2, y:loc.y+loc.height/2});
			this.mia.tindex.update(null, page);
			Muib.update_page.imgdesc(this.mia.keyuris[page]);
			Muib.appb.set_status("auto");
			this.viewer._sequenceIndex = tgpos;
		}else{
			if(!this.mia.ci().loaded){
				Muib.state.loadinfo = Mut.uri.set_action_info("for", this.mia.keyuris[tgpos]);
				Muib.appb.set_msg("request " + Muib.state.loadinfo[0] + "...", "normal", 500);
			}
			this.viewer.goToPage(tgpos);
		}
	},
	go_seq: function(which){
		var matched = which.match(/^(next|previous)/),
		offset = matched[1] === "next" ? 1 : -1,
		dir = Mia.env.rtl ? -1 : 1,
		dest = Mia.get_pos() + offset * dir;
		if(dest < 0 || dest >= Miiif.cvs.num) return;
		this.goTo(Mia.get_pos(dest), dest);
	},
	fit_bounds: function(xywh){
		var p = Muib.tool.anntrs_array(xywh);
		this.viewer.viewport.fitBounds(new OpenSeadragon.Rect(p[0], p[1], p[2], p[3]));
	},
	pan: function(pos){
		var p = Muib.tool.anntrs_array(pos + ",0,0");
		this.viewer.viewport.panTo({"x": p[0], "y": p[1]});
	},

	
	reset_size: function(dim, force){
		var adjust,
		mymia = this.mia,
		tindex = mymia.tindex,
		eltdim = {x: this.elt.clientWidth, y: this.elt.clientHeight};
		if(dim.x === undefined ||
		(dim.x === eltdim.x && dim.y === eltdim.y)){
			this.set_aspectr();
			return;
		}
		
		if((dim.x < eltdim.x && dim.y < eltdim.y) || force){
			adjust = 1;
		}else{
			adjust = this.adjust_dim(dim, eltdim);
		}
		this.adjusted = adjust;
		this.elt.style.height = dim.y * adjust + "px";
		this.elt.style.width = dim.x * adjust + "px";
		this.set_aspectr();
		
		if(mymia.elt.tindex) this.adjust_tindex();

	},
	adjust_dim: function(dim, testdim){
		var xadjust = testdim.x / dim.x,
		yadjust = testdim.y / dim.y;
		return Math.min(xadjust, yadjust);
	},
	set_aspectr: function(){
		Muib.state.osdv_org_h = this.elt.clientHeight;
		this.aspectr = this.elt.clientWidth / this.elt.clientHeight;
		if(this.mia && this.mia.elt.tindex) this.test_tioffset();
	},
	adjust_tindex: function(){
		var tielt = this.mia.elt.tindex;
		if(this.adjusted !== false){
			var offset = 5; //this.elt.classList.contains("pdf") ? 21 : 5;
			tielt.style.left = (this.elt.getBoundingClientRect().left + this.elt.clientWidth + offset) + "px";
			tielt.style.right = "auto";
			if(this.mia.struct.data.length){
				tielt.style.width = (tielt.clientWidth + 50) + "px";
			}
		}
		if(this.mia.tindex.state.use){
			if(tielt.clientHeight !== this.elt.clientHeight){
				if(this.mia.tindex.ulinfo.elt)
				this.mia.tindex.ulinfo.elt.style.height = this.elt.clientHeight + "px"
			}
		}
	},
	toggle: function(ev){
		var me = ev.target, label = me.innerText;
		if(label === "hide"){
			this.set_full_and_front();
			me.innerText = label = "show";
		}else{
			this.set_full();
			this.mia.tindex.state.behind = false;
			this.viewer.viewport.zoomTo(this.viewer.viewport.getZoom()*this.expand_ratio);
			me.innerText = label = "hide";
		}
	},
	set_full_and_front: function(){
		this.expand_ratio = this.set_full(true, this.elt.clientWidth);
		this.mia.tindex.state.behind = true;
	},
	set_full: function(to_full, org_w){
		if(!this.mia.elt.maindiv.parentElement){
			console.warn("no maindiv for set_full");
			return;
		}
		var ti = this.mia.tindex;
		if(to_full){
			this.elt.style.width = (this.mia.elt.maindiv.clientWidth + this.ti_offset) + "px";
			this.elt.style.height = (Muib.state.osdv_org_h + 32) + "px";
			ti.ppos.style.position = "relative";
			ti.ppos.style.top = (ti.viewinfo.clientHeight + 32) + "px";
			if(!ti.viewinfo.clientHeight) ti.state.need_ppos_adjust = true;
		}else{
			this.elt.style.width = "100%";
			this.elt.style.height = Muib.state.osdv_org_h + "px";
			ti.ppos.style.position = "static";
		}
		if(org_w) return this.elt.clientWidth / org_w;
	},
	
	insert_element: function(targetelt){
		this.container.insertBefore(
			targetelt,
			this.viewer.buttons.element.parentNode.parentNode
		);
	},
	test_tioffset: function(){
		this.ti_offset = this.mia.elt.tindex.clientWidth + (
			document.body.clientWidth > this.mia.const.narrow_scr_width ?
			this.mia.const.tindex_offset :
			this.mia.const.narrow_scr_tioffset
		);
	}
};


var Refstrip = function(mia) {
	this.mia = mia;
	this.osdv = mia.osdv;
	this.viewer = mia.osdv.viewer;
	this.vrs = this.viewer.referenceStrip;
	this.vertical = false;
	this.toggler = null;
	this.tgchar = {"close": "▾▾▾", "open": "▴▴▴"};
};

Refstrip.prototype = {
	setup: function(){
		if(!this.vrs) return;
		var that = this;
		this.mia.elt.refstr = this.vrs.element; // class="referencestrip"
		this.mia.elt.refstr_p = this.mia.elt.refstr.parentNode;
		this.set_width();
		if(this.osdv.osdbr === "mk"){
			this.mia.elt.refstr_p.className = this.mia.const.refstr_pclass + (this.vertical ? " rtl" : "");
			this.mia.elt.refstr_p.onscroll = function(e){
				Muib.tool.do_after(100, function(){that.set_current(e);});
			};
		}
		this.vrs.panelWidth = this.mia.const.refstr_width;
		if(this.mia.opts.v.showReferenceStrip === false){
			this.mia.elt.refstr_p.parentNode.style.display = "none";
		}else if(this.osdv.osdbr === "mk"){
			var togglediv = Mut.dom.elt("div", "", [["class", "refstgl"]]);
			this.toggler = Mut.dom.elt("span", this.tgchar.close, [["title", "hide Reference Strip"]]);
			this.toggler.onclick = function(){that.toggle();};
			togglediv.appendChild(this.toggler);
			this.mia.elt.refstr_p.insertBefore(togglediv, this.mia.elt.refstr);
		}
		if(this.mia.opts.v.inf){
			this.mia.elt.refstr_p.parentNode.style.width = "100%";
			this.mia.elt.refstr_p.style.width = "100%";
		}
		if(this.vertical){
			var refpp = this.mia.elt.refstr_p.parentNode;
			refpp.insertBefore(this.mia.elt.refstr_p, refpp.firstChild);
		}else{
			this.mia.elt.refstr.style.width = this.vrs.panels.length * (this.vrs.panelWidth + 3) + "px";
		}

		this.vrs.currentSelected.style.background = this.vrs.selectedBg = this.mia.const.refstr_bg;
		if(this.mia.opts.iniOsdPos >= this.mia.env.numTiles) console.warn(this.mia.opts.iniOsdPos,  this.mia.env.numTiles);else 
		this.vrs.setFocus(this.mia.opts.iniOsdPos);
	},
	toggle: function(which){
		if(this.toggler.innerText === this.tgchar.close){
			if(which === "show") return;
			this.mia.elt.refstr_p.parentNode.style.bottom = "-105px";
			this.toggler.innerText = this.tgchar.open;
			this.toggler.setAttribute("title", "show Reference Strip");
		}else{
			this.mia.elt.refstr_p.parentNode.style.bottom = 0;
			this.toggler.innerText = this.tgchar.close;
			this.toggler.setAttribute("title", "hide Reference Strip");
		}
	},
	set_width: function(){
		if(this.mia.elt.refstr_p) this.mia.elt.refstr_p.style.width = this.mia.elt.osdv.clientWidth + "px";
	},
	set_titleattr: function(label, pos){
		var that = this;
		if(typeof(pos)==="number" && pos >= 0){
			var dpos = this.get_pos(pos);
			if(!this.vrs.panels[dpos]) console.warn("no panel", pos, dpos,"for",label);
			else{
				this.vrs.panels[dpos].setAttribute("title", label);
				if(this.mia.tindex.state.use) this.vrs.panels[dpos].onclick = function(){that.mia.tindex.list[pos].className = "loading";};
			}
		}
	},
	
	set_current: function(e){
		this.vrs._loadPanels(e.target.scrollLeft);
	},
	get_pos: function(pos){
		return this.mia.get_pos(pos);
	}
};



var Tindex = function(mia) {
	this.mia = mia;
	this.osdv = null;
	this.list = [];
	this.ulinfo = {"elt": null, "bcr": null, "cp": 0, "up": 0, "lp": 0};
	this.clicktg = null;
	this.strb = {"low": 5, "unused": 10, "mindiv": 30};
	this.single_canvas = {"minranges": 10, "skip": false};
	this.elt = null;
	this.ppos = document.createElement("p");
	this.viewinfo = document.createElement("div");
	this.labels = {"max": {len: 0, text: ""}, "avg": 0, "acc": 0, "numlabel": 0};
	this.numpfx = "#";
	this.an = {label: " annot", pfx: "✍ "};
	this.state = {"use": true, "sidx": false, "numidx": false, "setdone": false, "lastfrag": null, "behind": false};
	this.void_pat = null;
	this.numPages = 0;
	this.prange = null;
	
};

Tindex.prototype = {
	prepare: function (osdv, use){
		this.osdv = osdv;
		this.state.use = use;
		if(
			this.mia.opts.v.ti==="no" || 
			this.mia.opts.v.inf ) this.state.use = false;
		if(this.state.use){
			if(!this.mia.elt.tindex){ 
				this.mia.elt.tindex = Mut.dom.elt("div", "", [["id", "titleidx"]]);
				this.mia.elt.maindiv.insertBefore(this.mia.elt.tindex, this.mia.osdv.elt);
			}
			this.elt = this.mia.elt.tindex;
			if(this.mia.env.type === "image"){
				this.osdv.test_tioffset();
				this.osdv.set_full_and_front();
			}
		}else if(this.mia.env.type === "image"){
			if(!this.mia.opts.v.inf) document.body.classList.add("nidx");
			var metawidth = "100%";
			var mi = Mut.dom.get(".metainfo");
			for(var i=0,n=mi.length; i<n; i++){
				mi[i].style.width = metawidth;
			}
			if(this.mia.opts.v.inf){
				var h = window.frameElement.clientHeight;
				this.mia.elt.osdv.style.height = (h > 700 ? 700 : (h > 400 ? 450 : 360))+"px";
			}
		}
		if(document.body.clientWidth < 750) this.mia.env.narrow_scr = true;
	},
	setup: function(annot){
		var that = this;
		this.void_pat = new RegExp(this.mia.opts.v.ti_void);
		this.target_ids = this.mia.keyuris;
		if(!this.state.use){
			if(this.mia.opts.v.inf && this.mia.refstrip.vrs) this.each_page(function(i, keyuri){
				var labelarr = that.set_tiledesc(i, keyuri);
				that.mia.refstrip.set_titleattr(labelarr[1] || labelarr[0], i);
			}, this);
			return false;
		}
		if(this.state.setdone) return false;
		this.state.setdone = true;
		this.numpfx = Miiif.cview.paged ? "⿰" : "#";
		var ullist;//, tidx = Mut.dom.get("#titleidx");
		if(this.mia.struct.data.length && this.mia.opts.v.struct !== "none"){
			ullist = this.mia.struct.setup(annot);
		}
		if(ullist){
			ullist.className = "struct";
		}else{
			if(ullist === false) this.list = [];
			ullist = Mut.dom.elt("ul");
			this.each_page(function(i, keyuri, that){
				var li = that.set_li(i, keyuri, annot);
				if(li){
					ullist.appendChild(li);
					that.list.push(li);
				}
			}, this);
		}
		this.construct_ti(ullist);
	},
	construct_ti: function(ullist, use_wide){
		this.ulinfo.elt = ullist;
		if(this.mia.env.type !== "image") this.mia.osdv.adjust_tindex();

		if(this.calc_numlabel_ratio() >= 0.9
			&& !Muib.state.struct
			&& !Miiif.searchs.setup_done
			&& this.mia.opts.v.ti !== "use") this.state.numidx = true;
		var tw = (this.labels.acc / this.list.length) + (Muib.state.narrowscrn ? 2 : 4);
		if(use_wide) this.elt.className = "widx";
		else if(tw <= Mut.html.set_limit(this.labels.max.text, "min") 
			&& this.mia.env.type==="image"
			&& !Muib.state.struct
			&& !Miiif.searchs.setup_done
		){
			this.state.sidx = true;
			document.body.classList.add("sidx");
			this.elt.className = "sidx";
			this.an.label = " annot";
			this.an.pfx = "";
			this.mia.refstrip.set_width();
		}
		this.init_vinfo(1);
		Mut.dom.append(this.mia.elt.tindex, [ullist, this.ppos, this.viewinfo]);
		if(this.state.need_ppos_adjust){
			this.ppos.style.top = (this.viewinfo.clientHeight + 32) + "px";
			this.state.need_ppos_adjust = false;
		}

		this.get_bcr();
		this.update(null);
		
	},
	calc_numlabel_ratio: function(){
		return this.labels.numlabel / this.list.length;
	},
	each_page: function(fn, that){
		for(var i=0,n=this.target_ids.length; i<n; i++){
			var id = this.target_ids[i];
			fn(i, id, that);
		}
	},
	get_bcr: function(){
		this.ulinfo.bcr = this.ulinfo.elt.getBoundingClientRect();
		this.ulinfo.cp = this.ulinfo.bcr.top + Math.round(this.ulinfo.elt.clientHeight/2);
		this.ulinfo.up = this.ulinfo.bcr.top + Math.round(this.ulinfo.elt.clientHeight/8);
		this.ulinfo.lp = this.ulinfo.bcr.top + Math.round(this.ulinfo.elt.clientHeight * 7/8);
	},
	init_vinfo: function(inipos, from_search){
		var that = this,
		pfx = inipos + " / ",
		pages = this.mia.env.numTiles,
		nonpaged = Miiif.cview.nonpaged.length,
		sfx = " (" + this.an.pfx + this.anno_disp();
		Mut.dom.append(
			this.ppos, 
			(Miiif.cview.paged && nonpaged ? [pfx, Mut.html.abbr(pages, pages + " visible + " + nonpaged +
				" 'non-paged'. Use individuals mode to show all pages"), sfx] :
			 	pfx + pages + sfx
			)
		);
		if(this.mia.env.type !== "image" || from_search) return;
		var vinfo = [],
		Cmap = {
			indv: "📄", individuals: "📄", default: "📄", void: "📄",
			paged: "📖", continuous: "⿲",
			ltr: "▷", rtl: "◁", ttb: "⇩"
		};
		if(!Miiif.curation){
			var disp = [];
			["view", "dir"].forEach(function(prop){
				var author_val = Miiif.vinfo[prop][0] || "default",
				user_val = Miiif.vinfo[prop][1];
				if(prop === "view" && ! Miiif.cview.noannot){
					disp.push(abbr("pv", "page view", author_val) + test_paged(Miiif.cview.paged ? "paged" : "indv"));
				}else if(prop === "dir"){
					disp.push(abbr("dr", "direction", author_val) + test_dir(Mia.env.rtl ? "rtl" : 
						((Miiif.vinfo.view[0] === "continuous") && (author_val === "top-to-bottom") ? "ttb" : "ltr")
					));
				}
			});
			if(disp.length) vinfo.push("<div><span>" + disp.join("</span> <span>") + "</span></div>");
		}
		if(Miiif.cview.noannot) vinfo.push(
			"<div title=\"Annotation is disabled because it must be set for specific canvas /image\">"
			+ "⊗annot ("+ changer("use", "void") +")</div>"
		);
		
		this.viewinfo.className = "vinfo";
		if(vinfo.length) this.viewinfo.innerHTML = vinfo.join("\n");
		if(Miiif.cvs.thumb_count){
			var galwapper = Mut.dom.elt("div", "gallery: ");
			galwapper.appendChild(this.mia.gallery.prep_btn());
			this.viewinfo.appendChild(galwapper);
		}
		if(document.body.clientWidth > this.mia.const.mobile_scr_width){
			var osdv_btn = osdv_toggle_btn(this.state.behind ? "show" : "hide");
			if(Muib.state.struct){
				Mut.dom.append(this.viewinfo, ["page structure: ", osdv_btn]);
				this.viewinfo.appendChild(this.mia.struct.set_strctab());
			}else{
				Mut.dom.append(this.viewinfo, ["page list: ", osdv_btn]);
			}
			this.osdv.test_tioffset();
			if(this.state.numidx ^ this.state.behind) osdv_btn.click();
		}
		
		function test_paged(current){
			var method="switcher", changeto,
			abbrs = {"indv": "individuals", "paged": "paged"};
			if(current === "paged"){//Miiif.cview.force_simple
				changeto = "indv";
				return switch_btn(changeto, method, abbrs[changeto])
				 + " "+ current_btn(current, abbrs[current]) ;
			}else{
				changeto = "paged";
				return current_btn(current, abbrs[current])
				+ " " + switch_btn(changeto, method, abbrs[changeto]);
			}
		}
		function test_dir(current){
			var method="switch_dir", changeto,
			abbrs = {"rtl": "right-to-left", "ltr": "left-to-right", "ttb": "top-to-bottom"};
			if(current === "ltr"){//Miiif.cview.force_simple
				changeto = "rtl";
				return switch_btn(changeto, method, abbrs[changeto])
				 + " "+ current_btn(current, abbrs[current]) ;
			}else if(current === "rtl"){
				changeto = "ltr";
				return current_btn(current, abbrs[current])
				+ " " + switch_btn(changeto, method, abbrs[changeto]);
			}else{
				return current_btn("ttb", abbrs["ttb"]);
			}
		}
		function switch_btn(mode, method, title){
			return "<span class=\"prepared\" title=\"change to " + title + "\" onclick=\"Miiif.cview." + method +"('" + mode +"');\">" + Cmap[mode] +"</span>";
		}
		function current_btn(str, title=str){
			return "<em class=\"inuse\" title=\"current: " + title +"\">" + Cmap[str] + "</em>";
		}
		function abbr(cont, title, source){
			return "<abbr title=\"" + title + (source ? ", source: " + source : "") + "\">" + cont +"</abbr> ";
		}
		function changer(author, vhint){
			return "<span class=\"pseudolink\" onclick=\"this.mia.tindex.change_view("
			+ (vhint ? "'" + vhint + "'"  : "") + ");\">" + author +"</span>";
		}
		function osdv_toggle_btn(label){
			var btn = Mut.dom.elt("span", label, [["class", "pseudolink"]]); 
			btn.onclick = function(ev){that.osdv.toggle(ev);};
			return btn;
		}
	},
	
	anno_disp: function (){
		return Manno.total + this.an.label + (Manno.total > 1 ? "s" : "")+")";
	},
	change_view: function(vhint){
		location.href = "?u=" + this.mia.opts.v.u +  (this.mia.opts.v.au ? "&au=" + this.mia.opts.v.au : "")
		+ (vhint ? "&vhint=" + vhint  : "")
		+ (Muib.state.pos ? "#p"+ (Miiif.cview.paged ? "v" : "") + (Muib.state.pos + 1 ): "");
	},
	
	set_tiledesc: function (i, uri){
		if(!uri) return false;
		if(!this.mia.cinfo[uri]) return [""];
		var ci = this.mia.cinfo[uri],
		clabel = ci.label ? ci.label.replace(this.void_pat, "").replace(/<.*?>/, "") : null,
		label,
		is_numlabel = false;
	
		if(clabel === "NP"){
			label = clabel + " " + this.numlabel(i);
			is_numlabel = true;
		}else if(clabel){
			label = clabel;
			if(label.match(/^([pf]\.? ?|page ?)?\d+?$/i)) is_numlabel = true;
		}else{
			var cdesc = ci.description;
			if(cdesc && !cdesc.match(this.void_pat)){
				label = Mut.html.attr_safe(ci.description.replace(/\s+/, " "));
			}else{
				label = this.numlabel(i);
				is_numlabel = true;
			}
		}
		var paged_label = Miiif.cview.append_paged_val(uri, "label");
		if(paged_label){
			label += paged_label;
			Mpj.set_maxlabel(label);
		}
		var labelarr = this.check_label_len(label, "short", is_numlabel);
		if(is_numlabel) this.labels.numlabel++;
		if(!ci.description){
			ci.description = ci.label ? String(ci.label) : "";
			if(ci.label_paged && ! ci.description_paged) ci.description_paged = ci.label_paged;
		}else if(ci.label && !ci.label.match(/^p\. \d+$/)
			&& ci.label !== ci.description
			&& !Miiif.searchs.has_result
		) ci.description = ci.label + ": " + ci.description;
		if(!Miiif.searchs.has_result) ci.need_dimcheck = Miiif.use;
		return labelarr;
		
	},
	numlabel: function(i){
		return "("+ this.numpfx + (i+1)+")";
	},
	check_label_len: function(label, lengthtype, is_numlabel){
		var ttlattr = "", lim = Mut.html.set_limit(label, lengthtype);
		if(label.length >= lim){
			ttlattr = label.substr(0, 75);
			label = label.substr(0, lim-2)+"...";
			Mpj.set_maxlabel(label);
		}
		return [label, ttlattr, is_numlabel];
	},
	set_li: function (i, keyuri, annot, tagname = "li"){
		var labelarr = this.set_tiledesc(i, keyuri);
		if(labelarr === false) return false;
		var imginfo = this.mia.cinfo[keyuri],
		numannot = imginfo ? anno_count(keyuri, imginfo) : 0;
		if(Miiif.cview.paged){
			var pcv = imginfo.pagedcv;
			if(pcv) numannot += anno_count(pcv, this.mia.cinfo[pcv]);
		}
		var li = Mut.dom.elt(tagname);
		var pos = i === "" ? "" : (i < 0 ? -i : this.mia.get_pos(i));
		li.setAttribute("data-p", pos);
		li.setAttribute("data-i", i);
		li.setAttribute("data-sig", Mut.uri.signat(keyuri));
		if(numannot && !Miiif.cview.noannot){
			li.setAttribute("data-an", numannot);
			Manno.total += numannot;
		}
		if(imginfo && imginfo.layer && Miiif.cview.noannot) li.setAttribute("data-ovl", imginfo.layer.length);
		this.set_li_hander(li);
		Mut.dom.append(li, labelarr[0]);
		if(labelarr[1]) li.setAttribute("title", labelarr[1]);
		else if(labelarr[2]) li.setAttribute("title", "(" + imginfo.urisig + ")");
		if(this.mia.refstrip && this.mia.refstrip.vrs) this.mia.refstrip.set_titleattr(labelarr[1] || labelarr[0], i);
		return li;
		
		function anno_count(uri, cinfo){
			return annot[uri] ? annot[uri].length : 
			((cinfo && cinfo.other && !Miiif.searchs.has_result) ? 1 : 0);
		}
	
	},
	add_deferred_annocount: function(){
		var annocount;
		Object.keys(Manno.tp).forEach(function(uri){
			if((annocount = Manno.tp[uri].length)) this.set_data_an_attr(annocount, uri);
		}, this);
	},
	
	set_li_hander: function(li){
		var that = this;
		li.onclick = function(ev){
			ev.ctrlKey ? that.showinfo(this) : that.lup(this);
		};
		li.onmouseenter = function(ev){
			if(ev.ctrlKey) that.showinfo(this, true);
		};
		li.onmouseout = function(){
			Muib.appb.set_status("loadcheck");
		};
	},
	lup: function(tg){
		this.clicktg = tg;
		if(Mav.type) this.lup_av(tg);
		else this.lup_img(tg);
		Muib.appb.msg.count = 0;
	},
	lup_img: function(tg){
		if(this.mia.gallery.showing) this.mia.gallery.toggle(false);
		if(Muib.state.pos !== Number(tg.getAttribute("data-i"))){
			Muib.appb.set_status("load");
			tg.className = "loading";
			var tgpos = Number(tg.getAttribute("data-p"));
			this.osdv.goTo(tgpos);
			this.test_canvas_frag(tg);

		}else if(tg.className !== "current"){
			this.set_current_li();
		}
	},
	lup_av: function(tg){
		var midx = tg.getAttribute("data-p"),
		dfrag = tg.getAttribute("data-frag"),
		mf = dfrag ? dfrag.match(/t=(\d+)/) : null,
		st = mf === null ? 0 : Number(mf[1]),
		prevuri = this.mia.key_uri();
		if(Mav.multicv){
			if(tg.className !== "current"){
				Mav.set_newpage(this.mia.keyuris[midx], prevuri, true, st, Number(tg.getAttribute("data-p")));
				this.set_current_li();
			}
			return;
		}else 
		if(Miiif.max_cvmedia === 1){
			Mav.state.current_pos = midx;
			if(midx !== "") Mav.check_new_vurl(Mav.muris[midx]);
			Mav.state.lastsec = st - 1;
			Mav.v.currentTime = st;
			Mav.v.play();
			if(Mav.cvurl !== Miiif.map[Mav.vinfo.url]) Mav.set_newpage(Miiif.map[Mav.vinfo.url], true);
			if(tg.className !== "current") this.set_current_li();
		}else{
			if(tg.className !== "current"){
				if(Mavclock.use){
					Mavclock.update(st);
				}else Mavannot.check_now(st);
				this.set_current_li();
			}
		}
	},
	showinfo: function(tg){
		var i = tg.getAttribute("data-i"), 
		p = tg.getAttribute("data-p"), plabel, imgurl, keyuri, ci;
		if(i==="") return;
		if(Mav.type){
			keyuri = this.mia.keyuris[p];
			ci = this.mia.cinfo[keyuri];
			plabel = "mediauri";
			imgurl= ci.mediaurl;
		}else{
			keyuri = this.mia.keyuris[i];
			ci = this.mia.cinfo[keyuri];
			plabel = "tile";
			imgurl= ci ? ci.imgurl : null;
		}
		var info = [
			"i (source): " + i,
			"p ("+plabel+"): " + p,
			"current pos: " + Muib.state.pos,
			"keyuri: " + ci.urisig,
			"mediaurl: " + (imgurl ? imgurl.split("/").slice(-5).join("/") : "same as keyuri")
		];
		alert(info.join("\n")); 
	},
	update: function(prevuri, pos){
		if(!this.state.use){
			Muib.state.pos = this.mia.get_pos();
		}else if(this.list.length > 1){
			this.set_current_li(pos);
			var newpage = (Muib.state.pos + 1);
			if(prevuri !== null){
				if(newpage === 1)  location.replace("#");
				else location.replace("#" + this.get_current_frag(newpage));
			}
			if(typeof(prevuri) !== "number")
			this.ppos.innerHTML = this.ppos.innerHTML.replace(/^\d+ \/ /, newpage + " / ");
			var lir = this.list[Muib.state.pos].getBoundingClientRect();
			if(lir.top <= this.ulinfo.bcr.top){
				if(lir.top > this.ulinfo.bcr.top-60) this.ulinfo.elt.scrollTop += (lir.top - this.ulinfo.up);
				else this.ulinfo.elt.scrollTop += (lir.top - this.ulinfo.cp);
			}else if(lir.bottom >= this.ulinfo.bcr.bottom){
				if(lir.top < this.ulinfo.bcr.bottom+60) this.ulinfo.elt.scrollTop += (lir.top - this.ulinfo.lp);
				else this.ulinfo.elt.scrollTop += (lir.top - this.ulinfo.cp);
			}
		}
	},
	set_current_li: function(pos){
		var mmia = this.mia;
		if(mmia.env.lielt){
			mmia.env.lielt.className = "";
		}
		if(pos===undefined) pos = mmia.get_pos();
		if(pos==="") return;
		Muib.state.pos = pos;
		var posli = this.list[Muib.state.pos];
		mmia.env.lielt = this.clicktg || posli;
		if(!mmia.env.lielt) return;
		mmia.env.lielt.className = "current";
		var prange = null;
		if(! this.clicktg){
			if(Muib.state.struct) prange = this.open_toggler(mmia.env.lielt);
		}else{
			this.clicktg = null;
		}
		test_prange(prange);
		this.test_canvas_frag(mmia.env.lielt);
		
		function test_prange(prange){
			var mc = mmia.env;
			if(mc.prange){
				if(mc.prange !== prange){
					if(mc.prange !== mc.lielt) mc.prange.classList.remove("current");
					mc.prange.classList.remove("prange");
				}
			}
			if(!prange) return;
			mc.prange = prange;
			if(prange.getAttribute("data-p") === mc.lielt.getAttribute("data-p")) prange.className = "current";
			else{
				mc.prange.classList.remove("current");
				mc.prange.classList.add("prange");
			}
		}
	},
	get_current_frag: function(page){
		return "p" + (Miiif.cview.paged ? "v" : "") + page;
	},
	open_toggler: function(node){
		var prange = null;
		if(this.mia.struct.vmapkeys){
			if(node.parentNode){
				prange = node;
			}else{
				var cid = node.getAttribute("data-sig");
				if(this.mia.struct.voidmap[cid]){
					prange = node = this.mia.struct.voidmap[cid];
				}else{
					console.log("no parent/map for", cid);//, node
					return null;
				}
			}
		}
		while((node = (node.parentNode ? node.parentNode.parentNode : null))){
			if(!node.classList.contains("range")) break;
			if(node.firstChild.className === "opener") Muib.tool.toggleobj(node.firstChild, true);
		}
		return prange;
	},
	set_data_an_attr: function(count, uri){
		if(this.list.length === 0) return;
		var li, pos;
		if(uri){
			if((pos = this.mia.keyuris.indexOf(uri)) === -1) return;
			li = this.list[this.mia.keyuris.indexOf(uri)];
			var current_count = li.getAttribute("data-an");
			if(current_count) count += Number(current_count);
		}else{
			li = this.list[Muib.state.pos];
		}
		if(count === 0){
			if(li.getAttribute("data-an")) li.removeAttribute("data-an");
		}else{
			li.setAttribute("data-an", count);
		}
	},
	test_canvas_frag: function(tg){
		var df = tg.getAttribute("data-frag");
		if(df && df.match(/^xywh/)){
			var p = tg.parentNode.parentNode,
			tgli = p.tagName === "li" ? p.firstChild : tg;
			Manno.pseudo_anno(
				tgli.innerText,
				df,
				this.mia.keyuris[tg.getAttribute("data-i")]
			);
			this.lastfrag = df;
		}else if(this.lastfrag){
			if(Manno.temp){
				Mwa.antrs.removeAnnotation(Manno.temp);
				Manno.temp = null;
				Manno.hilite_annoclip(false);
			}
		}
	}
};


var Struct = function(mia) {
	this.mia = mia;
	this.osdv = mia.osdv;
	this.tindex = mia.tindex;
	this.data = [];
	this.ullist = null;
	this.lis = {};
	this.used = [];
	this.unused = {};
	this.cloned = {};
	this.uri_label = {};
	this.r_map = {};
	this.r_ul = {};
	this.registered = {};
	this.strctab = null;
	this.memberp = "members";
	this.label_len_type = "semi";
	this.show_range_only = false;
	this.voidmap = {};
	this.vmapkeys = 0;
	this.ONE_CANVAS_ONLY = 0;
	this.ONE_CANVAS_AND_MORE = 1;
	this.NOT_SINGLE = 2;
	this.CANVASES_ONLY = 2;
	this.CANVASES_AND_MORE = 3;
	this.NO_SKIP = 0;
	this.skip_single_canvas = false;
	this.reslabel = ["ONE_CANVAS_ONLY", "ONE_CANVAS_AND_MORE", "CANVASES_ONLY", "CANVASES_AND_MORE"];
};
Struct.prototype = {
	refresh: function(){
		this.ullist = null;
		this.lis = {};
		this.used = [];
		this.unused = {};
		this.cloned = {};
		this.uri_label = {};
		this.r_map = {};
		this.r_ul = {};
		this.registered = {};
	},
	
	setup: function(annot, mode){
		if(!Mav.type && !Muib.state.is_error) Muib.appb.set_msg("proc structure...");
		Muib.state.struct = true;
		this.ullist = Mut.dom.elt("ul");
		for(var i=0,n=this.mia.keyuris.length; i<n ; i++){
			var keyuri = this.mia.keyuris[i];
			var li = this.tindex.set_li(i, keyuri, annot);
			if(li){
				this.lis[keyuri] = li;
				this.unused[keyuri] = true;
			}else{
			}
		}
		this.tindex.list = Object.values(this.lis);
		var numlabel_ratio;
		if(mode) this.show_range_only = ((mode === "bkmark" || mode === "ranges") ? true : false);
		else if(this.mia.opts.v.struct){
			if(this.mia.opts.v.struct === "bookmark") this.show_range_only = true;
			if(this.mia.opts.v.struct === "full") this.show_range_only = false;
			else if(this.mia.opts.v.struct.match(/^(semi|mid)$/)) this.label_len_type = this.mia.opts.v.struct;
		}else if(Miiif.curation) this.show_range_only = false;
		else if(this.data.length > 10){
			this.show_range_only = true;
		}else if((numlabel_ratio = this.tindex.calc_numlabel_ratio()) >= 0.8){
			this.show_range_only = true;
			console.log("bookmark structure set for mostly number labels", Math.round(numlabel_ratio*100)+"%");
		}
		
		return this.generate();
	},
	generate: function(){
		
		if(this.data[0].items) this.memberp = "items";
		this.skip_single_canvas = (this.data.length > this.tindex.single_canvas.minranges) ? true : this.tindex.single_canvas.skip; 
		this.data.forEach(function(r){
			var label = Mut.str.lang_val(r.label);
			Mpj.set_maxlabel(label);
			var el = this.prep_elt(label, true, r[Miiif.a.vhint]);
			var is_single = this.test_single(r),
			rsid = r[Miiif.a.id];
			if(r.ranges) this.proc_ranges(el, r.ranges, rsid);
			if(r.canvases) this.proc_canvases(el, r.canvases, rsid, label, is_single);
			if(r[this.memberp]) this.proc_members(el, r[this.memberp], rsid, is_single);
			this.register(el, rsid);
		}, this);
		var add_cond = this.calc_add_unused_cond();
		if(add_cond === -1) return this.failed();

		
		var hint, ulfc = this.ullist.firstChild, ulcn;
		if(ulfc && (hint = ulfc.getAttribute("data-hint")) && hint === "top"){
			this.ullist = ulfc.childNodes[1];
			ulfc = this.ullist.firstChild;
		}

		if(add_cond && this.mia.env.type === "image") this.add_unused(true); //&& hint !== "top"
		if(this.ullist.getElementsByTagName("ul").length === 0
		&& this.ullist.getElementsByTagName("li").length < 2){
			return this.failed();
		}
		if(this.mia.env.syncpage) this.open_branch(hint);
		return this.ullist;
	},
	failed: function(){
		console.warn("No TOC constructed from "+this.tindex.list.length + " pages.", this.ullist);
		Muib.state.struct = false;
		return false;
	},
	proc_ranges: function(elm, ranges, rsid){
		if(ranges.length === 0){
			console.warn("Zero range in", rsid);
			return;
		}
		this.r_ul[rsid] = elm.ul;
		ranges.forEach(function(rdid){
			this.r_map[rdid] = rsid;
		}, this); 
	},
	proc_canvases: function(elm, canvases, rsid, label, is_single){
		if(canvases.length === 0){
			console.warn("Zero canvas in", rsid);
			return;
		}
		if(is_single > this.ONE_CANVAS_AND_MORE){
			this.set_voidmap(canvases);
			if(this.show_range_only){
				canvases = [canvases[0]];
				is_single -= 2;
			}
		}
		if(is_single === this.ONE_CANVAS_ONLY){
			this.one_canvas(elm, canvases[0], label, is_single, false);
		}else{
			if(is_single === this.ONE_CANVAS_AND_MORE){
				if(this.r_map[canvases[0]]){
					return;
				}
				this.set_voidmap(canvases);
				elm.ul.setAttribute("data-dcuri", canvases[0]);
			}else{
				if(this.show_range_only) this.set_voidmap(canvases);
			}
			canvases.forEach(function(cvid, i){
				this.r_map[cvid] = rsid;
				var li = this.one_leaf(cvid, "", false);
				if(li) elm.ul.appendChild(li);
			}, this);
		}
	},
	set_voidmap: function(canvases){
		var pelt = this.lis[canvases[0]];
		if(!pelt && Miiif.cview.paged){
			var ci = this.mia.cinfo[canvases[0]], cpref;
			if(ci) cpref = ci.pagedref;
			else console.warn("no info for", canvases[0], canvases);
			if(cpref) pelt = this.lis[canvases[0]] = this.clone_one(cpref);
		}
		if(!pelt) return;
		pelt.setAttribute("data-vmap", true);
		canvases.forEach(function(cvid){
			if(this.lis[cvid]){
				this.voidmap[this.lis[cvid].getAttribute("data-sig")] = pelt;
				this.vmapkeys++;
			}else if(!Miiif.cview.paged && !cvid.match(/#xywh/)) console.log("no such canvas", Mut.uri.signat(cvid));
		}, this);
	},
	proc_members: function(elm, members, rsid, is_single){
		members.forEach(function(rm, i){
			if(rm[Miiif.a.vhint]==="no-nav") return;
			var membid = rm[Miiif.a.id] || rsid + "-" + i;
			var label = Mut.str.lang_val(rm.label);
			this.r_map[membid] = rsid;
			if(this.is_leaf(rm)){
				if(is_single === this.ONE_CANVAS_ONLY){
					this.one_canvas(elm, membid, label, is_single, true);
				}else{
					var li = this.one_leaf(membid, label, true);
					if(li){
						elm.ul.appendChild(li);
					}
				}
			}else{
				var status, newset;
				if(!this.r_ul[rsid])
					this.r_ul[rsid] = elm.ul;
				if(rm[this.memberp]) {
					var elmm = this.prep_elt(label, true);
					this.proc_members(elmm, rm[this.memberp], membid, this.test_single(rm));
				}else{
				}
			}
		}, this);
		this.register(elm, rsid);
	},
	one_leaf: function(uri, label, is_membr){
		var frag;
		if(uri.match(/^(.*)#(.*)$/)){
			uri = RegExp.$1;
			var f = RegExp.$2.match(/^(xywh|t)(=.*)$/);
			if(f){
				frag = f[0];
			}else{
				frag = "";
			}
		}
		var li = this.use(uri, frag, is_membr, "");
		if(!li){
			var uri2 = Mut.scheme.swap(uri);
			if((li = this.use(uri2, frag, is_membr, uri))){
				console.warn("different scheme for canvas reference in range");
				uri = uri2;
			}
		}
		if(li){
			if(label) {
				var labelarr = this.tindex.check_label_len(label, this.label_len_type);
				if(li.innerText) li.setAttribute("title", (labelarr[1] ? labelarr[1]+" ":"")+"("+li.innerText+")");
				li.innerText = labelarr[0];
			}
			if(li.innerText === ""){
				if(Mav.type) return false;
				else li.innerText = frag ? "(" + frag + ")" : "--";
			}
			Mut.obj.prepare(this.uri_label, uri);
			Mut.obj.countup(this.uri_label[uri], li.innerText);
			if(frag){
				if(this.uri_label[uri] && this.uri_label[uri][li.innerText] > 1)
				li.innerText += " (" + this.uri_label[uri][li.innerText] + ")";
			}
		}
		return li;
	},
	one_canvas: function(elmoc, uri, label, is_single, is_membr){
		if(is_single < this.NOT_SINGLE && !label) label = elmoc.label;
		elmoc.pli = this.one_leaf(uri, label, is_membr);
		elmoc.ul = null;
	},

	use: function(uri, frag, is_membr, org_scheme_uri){
		var uidx = this.used.indexOf(uri);
		if(uidx >=0
			|| frag
		){
			var li;
			if(this.lis[uri]){
				li = this.clone_one(uri, frag, is_membr);
			}else{
				var upos = this.find_media_idx(uri);
				li = this.tindex.set_li((upos === -1 ? "" : -upos), uri, {});
				if(li && frag) li.setAttribute("data-frag", frag);
			}
			if(uidx === -1){
				this.used.push(uri);
				if(this.unused[uri]) delete this.unused[uri];
			}
			return li;
		}else if(!this.lis[uri]){
			if(Miiif.cview.paged){
				var cinfo = this.mia.cinfo[uri];
				if(!cinfo && org_scheme_uri) cinfo = this.mia.cinfo[org_scheme_uri];
				if(!cinfo) console.warn("No canvas info for", uri, "nor", org_scheme_uri);
				else if(cinfo.pagedref) return this.clone_one(cinfo.pagedref, frag, is_membr);
			}
			return null;
		}else{
			this.used.push(uri);
			delete this.unused[uri];
			if(this.cloned[uri]) delete this.cloned[uri];
			return this.lis[uri];
		}
		
	},
	clone_one: function(uri, frag, is_membr){
		var li = this.lis[uri].cloneNode(true);
		li.setAttribute("data-uri", uri);
		this.tindex.set_li_hander(li);
		if(frag || is_membr) this.cloned[uri] = li;
		if(frag) li.setAttribute("data-frag", frag);
		return li;
	},
	find_media_idx: function(uri){
		if(!Mav.type) return -1;
		return Mut.scheme.arr_exists_another(this.mia.keyuris, uri);
	},
	prep_elt: function(label, is_opener, hint){
		var pli = Mut.dom.elt("li"),
		ul = Mut.dom.elt("ul"),
		labelarr = this.tindex.check_label_len(label, this.label_len_type),
		toggler = Mut.dom.elt("span", labelarr[0]);
		if(labelarr[1]) pli.setAttribute("title", labelarr[1]);
		Mut.dom.append(pli, toggler);
		pli.className = "range" + (is_opener ? "" : " openf");
		if(hint) pli.setAttribute("data-hint", hint);
		toggler.className = is_opener ? "opener" : "closer";
		toggler.onclick = function(){Muib.tool.toggleobj(this, true);};
		return {"pli": pli, "ul": ul, "label": label};
	},
	register: function(elm, id){
		var idsig = Mut.uri.signat(id), rmapid = this.r_map[id],
		rmapidsig = rmapid ? Mut.uri.signat(rmapid) : "unknown parent";
		if(!elm.pli){
			console.warn("no pli to regist for", rmapidsig, "called by", idsig, elm);
			return;
		}
		if(elm.ul) elm.pli.appendChild(elm.ul);
		if(!elm.ul && this.r_ul[id]){
			if(!elm.pli) console.log("no pli for", idsig, elm.pli);
			else elm.pli.appendChild(this.r_ul[id]);
		}
		if(rmapid){
			var rul;
			if((rul = this.r_ul[rmapid])){
				var dcand = rul.getAttribute("data-dcuri"), duri;
				if(dcand){
					var fcli = rul.firstChild;
					if((duri = elm.pli.getAttribute("data-uri")) &&
						duri === dcand &&
						fcli === this.lis[dcand]
					){
						if(fcli.getAttribute("data-vmap")){
							if(!fcli.getAttribute("title") && elm.pli.getAttribute("title")){
								fcli.setAttribute("title", fcli.innerText);
								fcli.innerText = elm.pli.innerText;
							}
							console.log("duplicated li: respect voidmap", Mut.uri.signat(dcand));
							return;
						}
						rul.removeChild(fcli);
						rul.removeAttribute("data-dcuri");
						elm.pli.removeAttribute("data-uri");
						console.log("duplicated li: replaced", Mut.uri.signat(dcand));
					}
				}
				if(id === rmapid){
					console.warn("Same id ("+idsig+") for parent and child. elm=", elm);
				}else{
					rul.appendChild(elm.pli);
					this.registered[id] = rmapid;
					delete this.r_map[id];
				}
			}else console.log("no range-ul for", rmapidsig, rul);
		}else{
			if(this.registered[id]){
			}else{
				this.ullist.appendChild(elm.pli);
				this.registered[id] ="top";
			}
		}
	},
	is_leaf: function(node){
		return Miiif.get_type(node) === "Canvas";
	},
	test_single: function(r){
		var count = {ranges:0, canvases:0};
		["ranges","canvases"].forEach(function(p){
			count[p] = (r[p] ? r[p].length : 0);
		});
		if(r[this.memberp]) r[this.memberp].forEach(function(m){
			if(this.is_leaf(m)) count.canvases++;
			else count.ranges++;
		}, this);
		return count.canvases === 1 ? (
			count.ranges === 0 ? this.ONE_CANVAS_ONLY:
			this.ONE_CANVAS_AND_MORE) : 
		(count.ranges === 0 ? this.CANVASES_ONLY:
			this.CANVASES_AND_MORE);
	},
	calc_add_unused_cond: function(){
		var usecount = this.used.length + Object.keys(this.cloned).length;
		if(usecount <= 1 && this.tindex.list.length > 3){
			console.warn("Ignored this structure that has " + (usecount ? "only one" : "no") + " canvas");
			return -1;
		}else if(
			usecount < this.tindex.list.length / this.tindex.strb.mindiv || 
			(usecount < this.tindex.strb.low && Object.keys(this.unused).length > this.tindex.strb.unused)
		) return 1;
		else return 0;
	},
	add_unused: function(is_closed){
		if(this.show_range_only) return;
		var el = this.prep_elt("[more]", is_closed);
		for(var uri in this.unused){
			if(this.cloned[uri]) ;
			else el.ul.appendChild(this.lis[uri]);
			delete this.unused[uri];
		}
		el.pli.appendChild(el.ul);
		this.ullist.appendChild(el.pli);
	},
	check_unregistered: function(){
		console.log("unregistered", this.r_map);
	},
	open_branch: function(hint){
		var uri = Object.keys(this.lis)[this.mia.env.syncpage];//[this.mia.opts.v.page - 1];
		if(!uri) return;
		if(this.unused[uri] && !this.cloned[uri]){
			if(this.mia.env.type === "image" && hint !== "top") this.add_unused(false);
		}else{
			var node = this.lis[uri];
			if(!node.parentNode && this.cloned[uri]) node = this.cloned[uri];
			while((node = (node.parentNode ? node.parentNode.parentNode : null))){//node.parentNode.parentNode
				if(node.className === "range"){
					node.classList.add("openf");
					node.firstChild.className = "closer";
				}
			}
		}
	},
	set_strctab: function(){
		var that = this;
		if(!this.strctab){
			this.strctab = {
				"base": Mut.dom.elt("div", "", [["id", "strctab"]]),
				"tabs": [
					Mut.dom.elt("span", "full", [["title", "include all pages"]]),
					Mut.dom.elt("span", "ranges", [["title", "ranges only (as bookmark)"]])
				]
			};
			this.strctab.tabs.forEach(function(t, i){t.onclick = function(e){that.reset(e);}; }); 
			Mut.dom.append(this.strctab.base, this.strctab.tabs);
		}
		var inuse = this.show_range_only ? 1 : 0;
		this.strctab.tabs[inuse].className = "active";
		this.strctab.tabs[1 - inuse].className = "pseudolink";
		return this.strctab.base;
	},
	reset: function(e){
		if(e.target.className === "active") return;
		this.refresh();
		var ullist = this.setup(Manno.page, e.target.innerText), ti = this.tindex;
		if(!ullist){
			console.log("could not change structure mode");
		}else{
			ullist.className = "struct";
			if(!ti.elt) {
				console.warn("no title index element", ti);
				ti.elt = this.mia.elt.tindex;
			}
			ti.elt.innerHTML = ti.ppos.innerHTML = "";
			ti.ulinfo.elt = ullist;
			ti.init_vinfo(1);
			Mut.dom.append(ti.elt, [ullist, ti.ppos, ti.viewinfo]);
			this.mia.env.lielt = null;
			ti.update();
		}
	}
};

var Filter = function(mia) {
	this.mia = mia;
	this.viewer = mia.osdv.viewer;
	this.stypes = ["brightness", "saturate", "contrast", "hue-rotate", "grayscale"];
	this.current = {};
	this.opts = {
		default: {"min": 0, "max": 200, "ini": 100, "unit": "%"},
		grayscale: {"min": 0, "max": 100, "ini": 0, "unit": "%"},
		sepia: {"min": 0, "max": 100, "ini": 0, "unit": "%"},
		"hue-rotate": {"min": -180, "max": 180, "ini": 0, "unit": "deg"}
	};
	this.slider = {};
	this.panel = null;
	this.ctrlbtn = null;
	
	var that = this;
	
	this.ctrlbtn = Mut.dom.elt("div","Filters", [["id", "fltctrl"], ["title", "toggles filter panel"]]);
	this.ctrlbtn.onclick = function(ev){
		if(ev.target !== that.ctrlbtn) return;
		else if(that.panel.style.display === "none")
			that.panel.style.display = "block";
		else that.panel.style.display = "none";
	};
	this.panel = Mut.dom.elt("div", "",  [["class", "panel"]]);
	this.stypes.forEach(function(type){
		var box = Mut.dom.elt("div"),
		label = Mut.dom.elt("span", type, [["title", "click to reset " + type]]),
		opts = this.opts[type] || this.opts.default,
		slider = Mut.dom.elt("input","",[
			["type", "range"],
			["min", opts.min],
			["max", opts.max],
			["value", opts.ini],
			["title", type + " " + opts.ini + opts.unit]
		]);
		label.onclick = function(){
			that.reset(type);
		};
		slider.addEventListener("change", function(ev) {
			that.set(type, ev.target.value, opts.unit);
		});
		Mut.dom.append(box, [label, slider]);
		Mut.dom.append(this.panel, box);
		this.slider[type] = slider;
	}, this);
	this.panel.style.display = "none";
	Mut.dom.append(this.ctrlbtn, this.panel);
	this.activate(false);
};
Filter.prototype = {
	activate: function(reload){
		this.viewer.controls[0].element.parentNode.insertBefore(this.ctrlbtn, this.viewer.controls[0].element);
		if(reload) this.mia.elt.osdcanvas = this.mia.elt.osdv.getElementsByTagName("canvas")[0];
	},
	makesure_partof_dom: function(){
		if(! this.ctrlbtn.parentNode.parentNode.parentNode.parentNode) this.activate(true);;
	},
	set: function(type, val, unit){
		if(!val) delete this.current[type];
		else{
			if(!unit) unit = "%";
			this.current[type] = val + unit;
		}
		var cssval = [];
		Object.keys(this.current).forEach(function(t){
			cssval.push(t + "(" + this.current[t] +")");
		}, this);
		this.mia.elt.osdcanvas.style.filter = cssval.join(" ");
		this.update_title(val, type, unit);
	},
	update_title: function(val, type, unit){
		this.slider[type].setAttribute("title", type + " " + val + unit);
	},
	reset: function(type){
		if(this.current[type]){
			this.set(type);
			this.slider[type].value = this.get_default(type);
		}
	},
	reset_all: function(){
		this.mia.elt.osdcanvas.style.filter = "";
		this.panel.style.display = "none";
		this.stypes.forEach(function(type){
			this.slider[type].value = this.get_default(type);
		}, this);
	},
	get_default: function(type){
		return this.opts[type] ? this.opts[type].ini : this.opts.default.ini;
	}

};

var Layers = function(mia){
	this.mia = mia;
	this.viewer = null;
	this.elt = null;
	this.btn = null;
	this.flipper = null;
	this.sldivs = null;
	this.ctrl = null;
	this.use_ctrl = true;
	this.cord = "b2t"; //"t2b",
	this.saved = [];
	this.items = [];
	this.last_loaded = null;
};
Layers.prototype = {
	add_layer: function(ci){
		if(this.last_loaded === this.mia.env.keyuri) return;
		var cinfo = ci || this.mia.cinfo[this.mia.env.keyuri];
		this.last_loaded = this.mia.env.keyuri;
		if(cinfo.layer && !Miiif.cview.force_simple){
			this.add_page_layer(cinfo);
			return true;
		}else{
			this.reset();
			return false;
		}
	},
	add_page_layer: function(cinfo){
		var op, t2b;
		if(cinfo.choice){
			op = 0;
			t2b = this.cord === "t2b";
		}else{
			op = 1;
			t2b = false;
		}
		this.items = (cinfo.layer[0].label === "filler") ? [] :
			[cinfo.imgurl];
		cinfo.layer.forEach(one_layer, this);
		if(cinfo.layer[0].label === "filler") this.items.unshift(cinfo.layer[0].tid);
		if(this.mia.opts && this.mia.opts.v.fb) this.viewer.viewport.fitBounds(Muib.tool.pix2osdRect(this.mia.opts.v.fb));
		else if(cinfo.center) this.viewer.viewport.panTo(cinfo.center, true);
		if(!cinfo.duration) this.setup(cinfo.layer, cinfo.choice, t2b, op);
		
		function one_layer(o){
			if(!o.tile) return;
			var option = (typeof(o.tile) === "string" || o.tile.url) ? {
				tileSource: o.tile
			} : o.tile;
			option.opacity = o.trange ? (o.trange[0]===0 ? 1 : 0) : op;
			if(t2b) option.index = 0;
			this.viewer.addTiledImage(option);
			this.items.push(o.tid);
		}
	},
	setup: function(layer, is_choice, t2b, ini_opc){
		var that = this;
		if(!this.use_ctrl) return;
		if(!this.elt){
			this.elt = Mut.dom.elt("div");
			this.elt.id = "lyctrl";
			this.btn = Mut.dom.elt("span", is_choice ? "choice" : "layers", [["class", "toggler"]]);
			this.btn.onclick = function(){
				if(that.ctrl.style.display === "none")
					that.ctrl.style.display = "block";
				else that.ctrl.style.display = "none";
			};
			this.flipper = Mut.dom.elt("span", "⇅", [["class", "flipper"]]);
			this.flipper.onclick = that.flip;
			this.ctrl = Mut.dom.elt("div");
			this.ctrl.style.display = "none";
			if(layer.length >= 18){
				this.ctrl.style.maxHeight = (this.mia.elt.osdv.clientHeight - 20) + "px";
				this.ctrl.style.overflowY = "scroll";
			}
			Mut.dom.append(this.elt, [this.btn, this.ctrl]);
			Mut.dom.append(this.mia.elt.osdv, this.elt);
			this.saved = [];
		}
		this.ctrl.innerHTML = "";
		this.sldivs = Mut.dom.elt("div");
		var n = layer.length - 1, base = t2b ? n : 0;
		for(var i=n; i>=0; i--){
			var tgitem = t2b ? n - i : i;
			this.gen_slider(i, layer[tgitem], i===base, ini_opc);
		}
		Mut.dom.append(this.ctrl, [this.flipper, this.sldivs, Mut.dom.elt("div", "0 - opacity - 1 ")]);
		if(is_choice) Mut.dom.append(this.ctrl, this.add_splitter(t2b));
		this.elt.style.display = "block";
		
	},
	gen_slider: function(i, o, is_base, ini){
		var that = this,
		active = is_base || ini,
		div = Mut.dom.elt("div", "", [["title", o.label || "layer image "+i], ["data-i", i], ["class", active ? "on" : "off"]]),
		img = Mut.dom.elt("img", "", [["src", this.get_thumb(o)]]),
		slider = Mut.dom.elt("input","",[["type", "range"], ["min", 0], ["max", 100], ["value", 100]]);
		if(!active) slider.disabled = true;
		img.onclick = function(){that.toggle(this);};
		slider.addEventListener("change", function(ev) {
			that.setopacity(ev.target.value / 100, this.parentNode.getAttribute("data-i"));
		});
		if(is_base) slider.className = "base";
		Mut.dom.append(div, [img, slider]);
		Mut.dom.append(this.sldivs, div);
	},
	get_thumb: function(obj){
		var ts, level, m;
		if(obj.tile){
			if((m = obj.tid.match(/^(.*)(\/info\.json|\.dzi|\.xml)$/))){
				ts = m[1];
				if(m[2] === "/info.json"){
					level = obj.level;
				}else{
					level = "dzi";
					ts += "_files/";
				}
			}else{
				ts = obj.tid;
				level = 0;
			}
		}else{
			var s = this.viewer.world.getItemAt(0).source;
			if(s["@context"]){
				level = Miiif.level.imgapi;
				ts = s["@id"];
			}else if(s.tilesUrl){
				ts = s.tilesUrl;
				level = "dzi";
			}else{
				ts = s.url;
				level = 0;
			}
		}
		return ts + (level ? (
			level === "dzi" ? "7/0_0.jpg" : 
			("/full/30,/0/" + (level >= 2 ? "default" : "native") + ".jpg")
		) : "");
	},
	add_splitter: function(t2b) {
		var that = this,
		vv = this.viewer,
		myname = "Splitter",
		btn = Mut.dom.elt("button", myname);
		btn.style.width = "100%";
		btn.onclick = function(){
			var label = this.firstChild,
			slider = that.elt.getElementsByTagName("input");
			if(label.data===myname){
				label.data += " is ON";
				if(that.mia.env.is_touch_dev){
					vv.gestureSettingsMouse.clickToZoom = false;
					vv.panHorizontal = false;
					vv.panVertical = false;
					vv.addHandler("canvas-press", that.split_we);
					vv.addHandler("canvas-drag", that.split_we);
				}else{
					that.mia.elt.osdv.addEventListener(
						"mousemove",
						function(e){that.split_e(e, that);},
						false
					);
				}
				for(var i=0,n=slider.length; i<n; i++){
					that.saved[i] = slider[i].value;
					slider[i].value = 100;
					that.setopacity(1, i);
				}
				this.style.backgroundColor = "#ffc9af";
				that.mia.osdv.elt.classList.add("slider");
			}else{
				label.data = myname;
				if(that.mia.env.is_touch_dev){
					vv.gestureSettingsMouse.clickToZoom = true;
					vv.panHorizontal = true;
					vv.panVertical = true;
					vv.removeHandler("canvas-press", that.split_we);
					vv.removeHandler("canvas-drag", that.split_we);
				}else{
					that.mia.elt.osdv.removeEventListener("mousemove", that.split_e , false ); 
				}
				for(var i=0,n = vv.world.getItemCount(); i<n; i++){
					vv.world.getItemAt(i).setClip(null);
					var s = slider[n-i-1];
					s.value = that.saved[n-i-1];
					that.setopacity(s.value/100, i);
					that.toggle(null, s.parentNode);
				}
				this.style.backgroundColor = "#ddd";
				that.mia.osdv.elt.classList.remove("slider");
			}
			
		};
		return btn;
	},
	fit_layer: function(){
		var mmia = this.mia;
		if(mmia.opts.v.fb || mmia.opts.v.xy || mmia.opts.v.xywh || Miiif.fit_done || Miiif.cview.force_simple) return;
		var cinfo = mmia.cinfo[mmia.env.keyuri],
		zoom_record_done = false,
		vv = this.viewer,
		that = this;
		if(!cinfo || !cinfo.layer) return;// || cinfo.center
		else if(cinfo.layer.length > 4) vv.viewport.zoomBy(0.8);
		else{
			zoom_record_done = true;
			var item1;
			if(!(item1 = vv.world.getItemAt(1))) var c=0,sid=setInterval(function(){
				if((item1 = vv.world.getItemAt(1))){
					show_whole(cinfo, item1);
					clearInterval(sid);
				}else if(c++ > 10){
					console.warn("failed to get layered item");
					clearInterval(sid);
				}
			}, 300);
			else show_whole(cinfo, item1);
		}
		if(Miiif.cview.layer){
			var startpage = mmia.opts.v.page || (mmia.env.rtl ? 1 : null);
			if(startpage !== null){
				Muib.appb.set_msg("Now moving to the initial page " + startpage + "...");
				var tgpos = mmia.get_pos(startpage - 1),
				targeturi = Mia.keyuris[tgpos],
				targetimg = Mia.cinfo[targeturi].imgurl,
				pat = new RegExp("^(.*)/[^/]+/[^/]+/[^/]+/(default|native)"),
				matched = targetimg.match(pat);
				Muib.state.loading_layer_id = matched[1];
				Muib.state.loading_layer_id_len = matched[1].length;
				mmia.osdv.goTo(tgpos);
			}else mmia.tindex.update(null, 0);
		}
		if(!zoom_record_done) record_zoom(cinfo, vv.viewport);
		Miiif.fit_done = true;
		
		function show_whole(cinfo, item1){
			var vp = that.viewer.viewport, size = vp._contentSize;
			if(cinfo.center && !cinfo.layer_tested) size = test_dim(cinfo, size, item1, that.viewer);
			if(vp._contentAspectRatio > that.mia.osdv.aspectr) vp.fitHorizontally();
			else vp.fitVertically();
			record_zoom(cinfo, vp);
		}
		function test_dim(ci, size, item1, theviewer){
			if(ci.layer[1].loc.normHeight !== item1.normHeight){
				if(Math.round(ci.layer[1].loc.normHeight * 20) !== Math.round(item1.normHeight * 20)){
					console.warn("wrong dimensions. prep:", ci.layer[1].loc.normHeight, "actual:",item1.normHeight);
					var item0 = theviewer.world.getItemAt(0);
					adjust_layer(ci, 1, item1, item0.source.dimensions.y / item0.source.dimensions.x);
					adjust_layer(ci, 0, item0, item0.normHeight);
					ci.center.y = item1.normHeight / 2;
					size = {x: 2, y: item1.normHeight};
					theviewer.viewport.panTo(ci.center, true);
				}
			}else ci.layer_tested = true;
			return size;
		}
		function adjust_layer(ci, idx, item, height){
			console.log("normHeight", ci.layer[idx].loc.height, "=>", height);
			ci.layer[idx].loc.height = height;
			if(ci.layer[idx].tile){
				ci.layer[idx].tile.fitBounds.height = height;
				ci.layer[idx].loc.normHeight = item.normHeight;
			}
			item.fitBounds(ci.layer[idx].loc);
		}
		function record_zoom(cinfo, vp){
			if(Miiif.cview.paged){
				if(!Muib.state.paged_zoom){
					Muib.state.paged_zoom = vp.getZoom();
					Muib.state.pagedCenter = cinfo.center;
					console.log("center, zoom set to", Muib.state.pagedCenter.x, Muib.state.paged_zoom);
				}else {
					vp.zoomTo(Muib.state.paged_zoom);
				}
			}
			cinfo.need_refit = false;
		}
		function calc_center(ci){
			var loc = [ci.layer[0].loc, ci.layer[1].loc];
			return {x: (loc[0].width + loc[1].width) / 2, y: loc[0].height / 2};
		}
	},
	reset: function(){
		if(this.elt) this.elt.style.display = "none";
	},
	setopacity: function(op, i){
		this.viewer.world.getItemAt(i).setOpacity(op);
	},
	flip: function(){
		var vw = this.viewer.world,
		sc = this.sldivs;
		for(var i=0,n=vw.getItemCount(); i<n-1; i++){
			vw.setItemIndex(vw.getItemAt(0), n-i-1);
			var bar = sc.removeChild(sc.childNodes[n-i-2]);
			bar.setAttribute("data-i", n-i-2);
			sc.appendChild(bar);
		}
		sc.firstChild.setAttribute("data-i", n-1);
	},
	toggle: function(tg, div){
		var onoff;
		if(tg){
			div = tg.parentNode;
			onoff = div.className === "on" ? "off" : "on";
		}else{
			tg = div.firstChild;
			onoff = div.className;
		}
		var slider = tg.nextSibling;
		if(onoff==="off"){
			div.className = "off";
			slider.disabled = true;
			this.setopacity(0, div.getAttribute("data-i"));
		}else{
			div.className = "on";
			slider.disabled = false;
			this.setopacity(slider.value / 100, div.getAttribute("data-i"));
		}
	},
	
	split_we: function(e){
		var wldpos = e.position;
		wldpos.x += this.mia.elt.osdv.offsetLeft;
		wldpos.y += this.mia.elt.osdv.offsetTop;
		this.split_pos(wldpos);
	},
	split_e: function(e, that){
		that.split_pos(new OpenSeadragon.Point(e.clientX, e.clientY));
	},
	split_pos: function(wldpos){
		var pos = this.viewer.world._items[0].windowToImageCoordinates(wldpos);
		this.splitter(pos);
	},
	splitter: function(pos){
		var vv = this.viewer, n = vv.world.getItemCount(),
		dim = vv.source.dimensions;
		if(pos.x < -20 || pos.x > dim.x + 20) return;
		clip(n-1, 0, 0, n > 3 ? pos.x : dim.x+1, pos.y);
		if(n>2) clip(n-2, 0, 0, pos.x, dim.y);
		if(n>3) clip(n-3, 0, pos.y, dim.x, dim.y - pos.y);
		
		function clip(i, x, y, w, h){
			vv.world.getItemAt(i).setClip(new OpenSeadragon.Rect(x, y, w, h));
		}
	}
};

var Gallery = function(mia) {
	this.mia = mia;
	this.showing = false;
	this.myelt = null;
	this.btn = null;
	this.boxes = [];
	this.gbr = null;
};

Gallery.prototype = {
	set: function(to_set){
		if(!this.mia.env.keyuri || !this.mia.tindex.state.use){
			return false;
		}else if(!this.mia.cinfo[this.mia.env.keyuri].thumbnail){
			return "Not available";
		}else if(to_set===false || this.showing){
			this.toggle(false);
		}else{
			if(!this.myelt){
				this.prepare();
				var fbox = "", that = this;
				Object.keys(this.mia.cinfo).forEach(function(uri, i){
					var ci = this.mia.cinfo[uri];
					if(!ci.dim && !ci.thumbnail) return;
					var label = (ci.label || "#" + (i+1)),
					imguri = (ci.thumbnail === undefined) ? this.mia.const.noimage :
						(typeof(ci.thumbnail)==="string" ? ci.thumbnail : ci.thumbnail[Miiif.a.id]),
					fb = Mut.dom.elt("figure");
					fb.onclick = function(){that.lup(i);};
					Mut.dom.append(fb, [
						Mut.dom.elt("img", "", [["src", imguri], ["title", label]]),
						Mut.dom.elt("figcaption", Mut.html.trim_text(label, "short", true))
					]);
					this.boxes.push(fb);
					this.myelt.appendChild(fb);
				}, this);
				this.gbr = this.myelt.getBoundingClientRect();
			}
			this.toggle(true);
		}
		
	},
	prepare: function(){
		this.myelt = this.mia.elt.gallery = Mut.dom.elt("div", "", [["class", "gbox"]]);
		this.set_width();
		this.myelt.style.opacity = 0;
		this.mia.elt.osdv.appendChild(this.myelt);
	},
	set_width: function(){
		this.myelt.style.width = (this.mia.elt.maindiv.clientWidth + 
			(this.mia.env.narrow_scr ? 0 : this.mia.osdv.ti_offset)) + "px";
		this.myelt.style.height = this.mia.elt.osdv.clientHeight + "px";
	},
	prep_btn: function(){
		if(this.btn) return this.btn;
		var that = this;
		this.btn = Mut.dom.elt("span", "show", [["class", "pseudolink"]]);
		this.btn.onclick = function(){that.set();};
		return this.btn;
	},
	toggle: function(tf){
		if(tf){
			if(this.myelt) update_elt(true, this); //this.myelt.style.display = "flex";
			this.showing = true;
			this.btn.innerText = "hide";
		}else{
			if(this.myelt) update_elt(false, this); //this.myelt.style.display = "none";
			this.showing = false;
			this.btn.innerText = "show";
		}
		
		function update_elt(to_show, that){
			if(to_show){
				check_current(that.boxes, that.gbr, that);
				Muib.tool.fadeio(that.myelt, 100, 0, 10);
			}else{
				Mut.dom.get("current", "class", that.myelt)[0].classList.remove("current");
				Muib.tool.fadeio(that.myelt, 100, 1, -1);
			}
		}
		function check_current(boxes, gbr, that){
			var pos = Miiif.cview.paged ? Miiif.cview.p2pv(null, Muib.state.pos+1) : Muib.state.pos,
			bbr = boxes[pos].getBoundingClientRect();
			boxes[pos].classList.add("current");
			if(!bbr.height){
				var sid = setInterval(function(){
					bbr = boxes[pos].getBoundingClientRect();
					console.log(bbr.height);
					if(bbr.height) clearInterval(sid);
				}, 200);
			}
			if(bbr.top > gbr.bottom) that.myelt.scrollTop += bbr.top - bbr.height + gbr.top;
			else if(bbr.bottom < gbr.top) that.myelt.scrollTop += bbr.top - bbr.height - gbr.top;
		}
	},
	lup: function(i){
		var pos;
		if(Miiif.cview.paged){
			pos = Miiif.cview.p2pv(i + 1);
			if(pos <= -1){
				console.log("hidden page in paged mode. will switch to individuals mode.");
				pos = i;
				Miiif.cview.switcher("indv", null, pos);
				this.toggle(false);
				return;
			}
		}else{
			pos = i;
		}
		if(pos === Muib.state.pos){
			this.toggle(false);
		}else{
			this.mia.elt.osdcanvas.style.opacity = 0;
			if(this.mia.tindex.list.length) this.mia.tindex.lup(this.mia.tindex.list[pos]);
			else{
				this.toggle(false);
				this.mia.osdv.goTo(pos);
			}
		}
	}
};




var Canvas = function(mia, iiif){
	this.iiif = iiif;
	this.mia = mia;
	this.tile = null;
	this.annot = {};
	this.cv = null;
	this.cvuri = "";
	this.cinfo = null;
	this.info = null;
	this.durmax = 0;
	this.medias = 0;
	this.full_imgs = 0;
	this.num_filler = 0;
	this.current_mediaurl = null;
	this.first_body = null;
	this.thumbcand = null;
	this.thumb_width = this.mia.const.thumb_width;
	
	this.a = iiif.a;
	this.v = iiif.v;
	this.contprop = iiif.a.content || this.iiif.find;
	this.othpat = this.mia.opts.v.othpat ?
	this.mia.opts.v.othpat.replace(/{manuri}/, this.mia.opts.v.u).
	replace(/{manid}/,  Mut.uri.filename(this.mia.opts.v.u.replace(/[-\/\.]?manifest(\.json)?$/, ""))) : null;
};
Canvas.prototype = {
	proc: function(tiles, cv, info){
		if(typeof(cv) !== "object"){
			info.error = "Not a valid canvas";
			return false;
		}
		var contprop = this.a.content || this.iiif.find_prop_used(cv, "content");
		if(!(this.cvuri = cv[this.a.id])){
			console.error("No id for canvas", cv);
			this.cvuri = "urn:temp:" + Date.now();
		}
		this.cv = cv;
		this.info = info;
		this.is_subcanvas = tiles === null ? true : false;
		if(!this.mia.cinfo[this.cvuri]) this.mia.cinfo[this.cvuri] = {};
		this.cinfo = this.mia.cinfo[this.cvuri];
		
		this.cinfo.dim = set_dimension(cv);
		this.cinfo.mf = {};
		this.duration = cv.duration;
		this.durmax = 0;
		this.medias = 0;
		var cvcon = cv[contprop] ? (cv[contprop] instanceof Array ? cv[contprop] : [cv[contprop]]) : null;
		if(cvcon) cvcon.forEach(function(cont){
			if(typeof(cont) !== "object"){
				console.warn("Not a valid Annotation of type", typeof(cont));
				return;
			}
			var type = Mut.get_first(cont[this.a.type]);
			if(type === this.v.annotation){
				this.proc_one_item(cont);
			}else if(type === this.v.annolist){
				this.proc_annotpage(cont);
			}else if(cont.format){
				if(cont.format.match(/^(video|audio)/)){
					this.set_mediaurl(cont[this.a.id], Mut.str.uc_first(RegExp.$1), null, cont.format);
				}else if(Mia.const.threed_formats.indexOf(cont.format) > -1){
					this.set_mediaurl(cont[this.a.id], "ThreeD", null, cont.format);
				}else if(cont.format === "application/pdf"){
					this.set_mediaurl(cont[this.a.id], "pdf", null, cont.format);
				}else{
					console.warn("Unknown canvas item format", cont.format);
				}
			}else{
				console.warn("Unknown canvas item type", type);
			}
		}, this);
		else this.proc_missing();
		
		if(this.othpat) Mut.arr.add(cv, "otherContent",
			this.othpat.replace(/{cvuri}/, this.cvuri).
			replace(/{cvid}/, Mut.uri.filename(this.cvuri.replace(/\/canvas$/, "")))
		);
		if(cv.otherContent) cv.otherContent.forEach(function(oth){
			this.content_annot(oth, this.cvuri);
		}, this);
		else if(cv.annotations) cv.annotations.forEach(function(annopage){
			this.proc_annotpage(annopage);
		}, this);
		if(this.duration){
			this.timed_canvas(cv);
		}else{
			this.cinfo.duration = this.durmax;
		}
		
		if(this.is_subcanvas){
			this.cinfo.subctile = this.tile;
			this.cinfo.parent_cv = info.parent_cv;
		}else{
			if(cv.thumbnail) set_thumb(this, cv.thumbnail);
			else if(this.thumbcand) set_thumb(this, this.thumbcand);
			
			if(cv[this.a.vhint]) this.cinfo.vhint = cv[this.a.vhint];
			this.iiif.max_cvmedia = Math.max(this.iiif.max_cvmedia, this.medias);
			
			var lb = Mpj.set_label(cv, this.cvuri), desc;
			if((desc = cv.description || cv.summary)) this.cinfo.description = Mut.html.safe_text(desc);
			else if(this.first_body && (desc = this.first_body.description || this.first_body.summary)){
				if(!desc.match(/^\[paragraph:/))
				this.cinfo.description = Mut.html.safe_text(desc);
			}
			this.set_canvas_meta(cv);
			this.cinfo.urisig = "on " +Mut.uri.signat(this.cvuri);
			
			Mut.arr.uniq_push(this.mia.keyuris, this.cvuri);
			this.iiif.cvs.ullist.push(this.cvuri);
			this.iiif.cvs.full_imgs += this.full_imgs;
			if(this.tile) if(this.mia.env.rtl){
				tiles.unshift(this.tile);
			}else{
				tiles.push(this.tile);
			}
		}

		return this.annot;
		
		function set_dimension(cv){
			var dim = {}, prop = {"x": "width", "y": "height"}, type, invalid = [];
			for(var key in prop){
				if(!cv[prop[key]]){
					if(!cv.duration) invalid.push(prop[key] + ": undefined");
				}else if((type = typeof(cv[prop[key]])) !== "number"){
					var val = Number(cv[prop[key]]);
					if(isNaN(val)) invalid.push(prop[key] +": " + cv[prop[key]]);
					else invalid.push(prop[key] + ": " + type);
					dim[key] = val;
				}else dim[key] = cv[prop[key]];
			}
			dim.temp = true;
			if(invalid.length) console.warn("Invalid canvas dimension(s)", invalid.join(", "));
			return dim;
		}
		function set_thumb(that, thumb){
			that.cinfo.thumbnail = thumb;
			that.iiif.cvs.thumb_count++;
		}
	},
	proc_annotpage: function(annotpage){
		if(annotpage.items) annotpage.items.forEach(function(item){
			this.proc_one_item(item);
		}, this);
		else this.content_annot(annotpage, this.cvuri);
	},
	proc_one_item: function(item){
		var body_arr = this.get_bodies(item, this.a.body),
		tg = item[this.a.target];
		if(!tg) console.warn("No target specified");
		body_arr.forEach(function(bodyr){
			if(!bodyr) return;
			if(!this.first_body) this.first_body = bodyr;
			var type = this.iiif.get_type(bodyr),
			bodyid = bodyr[this.a.id];
			if(type === "SpecificResource" && bodyr.full) type = this.iiif.get_type(bodyr.full);
			switch(type){
			case "Image" :
				this.image_and_tile(bodyr, tg, item.stylesheet);
				break;
			case "Video" :
			case "Audio" :
			case "Sound" :
				this.set_mediaurl(bodyid, type, tg, bodyr.format, item.timeMode);
				break;
			case "TextualBody" :
				var agc = Mut.obj.copy(item);
				agc[this.a.target] = tg;
				agc[this.a.body] = bodyr;
				this.iiif.proc_one_embed(agc, this.annot, 0, this);
				break;
			case this.iiif.v.annocollection :
				this.content_annot(bodyr, this.cvuri);
				break;
			case "Choice" :
				this.set_choice(bodyr, tg, item.stylesheet);
				break;
			case "PhysicalObject" :
			case "ThreeD" :
				if((Mia.const.threed_formats.indexOf(bodyr.format) > -1)
					|| bodyid.match(/\.obj$/)
				){
					this.set_threed(bodyid, tg, bodyr);
					break;
				}
			case "PDF" :
				this.set_mediaurl(bodyid, "pdf", tg, bodyr.format);
				break;
			case "Document" :
				if(bodyr.format === "application/pdf"){
					this.set_mediaurl(bodyid, "pdf", tg, bodyr.format);
					break;
				}
			case "Text" :
			case "SpecificResource" :
			case undefined :
				this.guess_type(bodyr, tg, item.stylesheet);
				break;
			case "Canvas":
				var mfinfo = this.set_mediaurl(bodyid, type, tg, bodyr.format, item.timeMode),
				subcanvas = new Canvas(this.mia, this.iiif),
				subanno = subcanvas.proc(
					null,
					bodyr,
					{
						type: {},
						parent_cv: this.cvuri,
						accum_dur: mfinfo.t ? mfinfo.t[0] : 0
					}
				);
				Mut.obj.merge(this.annot, subanno);
				break;
			default :
				console.warn("Unknown type", type, bodyr);
			}
		}, this);
	},
	get_bodies: function(item, bodyp){
		if(typeof(item) === "string"){
			var r = {};
			r[this.a.id] = item;
			return [r];
		}else{
			if(item[bodyp] instanceof Array){
				return item[bodyp];
			}else{
				if(!item[bodyp]) {
					return  [{"value": "", "type": "TextualBody"}];
				}else{
					return [item[bodyp]];
				}
			}
		}
	},
	set_choice: function(r, tg, styles){
		var items = r.items || r.item,
		type = this.iiif.get_type(items[0]);
		switch(type){
		case "Video" :
		case "Audio" :
			var urls = [], format = [];
			items.forEach(function(item){
				urls.push(item[this.a.id]);
				format.push(item.format);
			}, this);
			this.set_mediaurl(urls, type, tg, format, r.timeMode);
			break;
		case "Text":
			if(items[0].format && items[0].format==="text/vtt"){
				this.set_vtt(items);
				break;
			}
		case "TextualBody":
			console.log("one item-> choice of body->",type);
			Mpj.webannot.multi_body(this.annot, items, {base:this.cvuri}, this.info);
			break;
		case "Image" :
			var loct;
			if(r.items){
				loct = this.image_and_tile(items.shift(), tg, styles);
			}else{
				if(r.default) loct = this.image_and_tile(r.default, tg, styles);
				else loct = this.calc_loct(tg);
			}
			items.forEach(function(item){
				this.set_layers(item, this.set_tile(item, loct, styles), tg, loct);
			}, this);
			this.cinfo.choice = true;
			break;
		default:
			console.log("who knows?", type, r);
		}
	},
	image_and_tile: function(r, tg, styles){
		var loct = this.calc_loct(tg),
		tile = this.set_tile(r, loct, styles);
		if(tile.error){
			console.error(tile.error, this.cv);
		}else if(this.cinfo.imgurl){
			this.set_layers(r, tile, tg, loct);
		}else{
			this.tile = tile;
			if(typeof(tile)==="string") this.iiif.tilemap[tile] = this.cvuri;
			this.set_mediaurl(r[this.a.id] || loct[3], "Image", tg);
			this.full_imgs += test_full_img(loct[0], this.cinfo.dim);
			if(loct[2]){
				if(loct[1]){
					this.cinfo.timedlayer = true;
					this.iiif.tfmedia ++;
				}
				if(! this.cinfo.layer) this.cinfo.layer = [];
				this.cinfo.layer[0] = {
					tile: null,
					tid: loct[3],
					label: "base image",
					loc: loct[0],
					trange: loct[1]
				};
			}
			this.cinfo.tid = loct[3];
			if(loct[0]) this.cinfo.baseloc = true;
		}
		return loct;
		
		function test_full_img(rect, dim){
			if(!rect) return 1;
			else if(rect.x !== 0 || rect.y !==0 || rect.width < 1) return 0;
			else if(rect.height < dim.y / dim.x) return 0;
			else return 1;
		}
	},
	set_layers: function(r, tile, tg, loct){
		if(! this.cinfo.layer) this.cinfo.layer = [{"label": "base image", "tile": null}];
		var tgp = Mut.frag.parse_obj(tg),
		rf = r.full || r.default || r,
		level = (rf.service && rf.service["@context"]) ? this.get_api_level(rf.service["@context"]) : 0,
		layer = {
			tile: tile,
			tid: loct[3],
			label: rf.label || null,
			level: level,
			loc: loct[0],
			trange: loct[1]
		};
		if(loct[1]){
			this.cinfo.timedlayer = true;
			this.iiif.tfmedia ++;
		}
		this.cinfo.layer.push(layer);
	},
	calc_loct: function(tg){
		var tgp = Mut.frag.parse_obj(tg), res = [null, null];
		if(tgp[1]) res[0] = Muib.tool.pix2viewportRect(tgp[1], this.cv.width);
		if(tgp[2]) res[1] = Mut.arr.of_nums(tgp[2]);
		res[2] = res[0] !== null || res[1] !== null;
		return res;
	},
	set_mediaurl: function(urls, type, tg, formats, timeMode){
		var url, formats;
		if(typeof(urls)==="string"){
			urls = [urls];
			formats = [formats];
		}
		var url = urls.shift(),
		format = formats.shift(),
		parsed = Mut.frag.parse_uri(url), 
		murl = parsed[0];
		this.current_mediaurl = murl;
		this.medias++;
		var prop, mf;
		if(type === "Image"){
			prop = "imgurl";
		}else{
			if(type === "Video") this.iiif.num_video++;
			else if(type === "Canvas") Mut.arr.add(this.cinfo, "subcanvases", murl);
			prop = "mediaurl";
			Mpj.webannot.set_info_type(type, murl, format, this.info);
			if(this.iiif.medias[murl]) this.iiif.medias[murl].count++;
			else this.iiif.medias[murl] = {count: 1}; 
			this.cinfo.map = this.cvuri;
			if(!this.cinfo.mf[murl]) this.cinfo.mf[murl] = [];
			mf = {"type": type};
			if(tg){
				var u = Mut.frag.parse_obj(tg);
				Canvas.set_mf(this, mf, u[1], u[2], parsed[1], parsed[2], format, timeMode);
			}
			if(urls.length) mf.choice= {"id": urls, "format": formats};
			this.cinfo.mf[murl].push(mf);
		}
		this.cinfo[prop] = murl;
		this.iiif.map[murl] = this.cvuri;
		return mf;
	},
	set_threed: function(id, tg, bodyr){
		this.set_mediaurl(id, "ThreeD", tg, bodyr.format);
		if(bodyr.cameraPosition) this.info.camera_pos = bodyr.cameraPosition;
		this.cinfo.has_3d = true;
	},
	set_vtt: function(items){
		if(!(items instanceof Array)) items = [items];
		var vtt = [],
		mf = this.cinfo.mf[this.current_mediaurl],
		len = mf.length;
		items.forEach(function(item){
			vtt.push({
				id: item[this.a.id],
				label: item.label,
				language: item.language
			});
		}, this);
		mf[len-1].vtt = vtt;
	},
	guess_type: function(r, tg, styles){
		var id = Mut.obj.get_oneuri(r); //typeof(r) === "string" ? r : r[this.a.id];
		if(!id && r.source){
			r = r.source;
			id = Mut.obj.get_oneuri(r);
		}
		var m = id ? id.match(/^(.*\.)([^\.#]+)(#[^#]+)?$/) : null;
		if(m){
			var uri = m[1] + m[2];
			switch(m[2]){
			case "mp4":
				this.set_mediaurl(id, "Video", tg);
				break;
			case "mp3" :
			case "m4a" :
			case "ogg" :
				this.set_mediaurl(id, "Audio", tg);
				break;
			case "jpg" :
			case "png" :
			case "svg" :
				this.image_and_tile(r, tg, styles);
				break;
			case "vtt" :
				this.set_vtt(r);
				break;
			default:
				console.warn("Unknown type (extension)", m[2], r);
				return false;
			}
		}else{
			this.image_and_tile(r, null, styles);
		}
	},
	set_tile: function(r, loct, styles){
		if(!r) return  {"error": "no image resouce"};
		
		var tsource,
		rf = r.full || r.default || r;
		if(rf.service){
			var rs = Mut.get_first(rf.service);
			if(rs.profile === "http://schemas.microsoft.com/deepzoom/2008"){
				tsource = loct[3] = rs[this.a.id];
				this.thumbcand = rs[this.a.id].replace(/\.(xml|dzi)$/, "_files/8/0_0.jpg");
			}else if(rs.profile === "http://www.zoomify.com/"){
				tsource = {
					type: "zoomifytileservice",
					width: rf.width,
					height: rf.height,
					tilesUrl: rs[this.a.id]
				};
				loct[3] = rs[this.a.id];
				this.thumbcand = rs[this.a.id] + "TileGroup0/0-0-0.jpg";
			}else{
				var cleanid = rs[this.a.id].replace(/\/$/, "");
				loct[3] = cleanid + "/info.json";
				if(rs.tiles){
					tsource = {tileSource: rs};
				}else tsource = loct[3];
				if(this.iiif.level.imgapi === 0) this.iiif.level = check_levels(rs, this);
				this.thumbcand =
				cleanid + "/full/" + this.thumb_width + ",/0/" + this.iiif.level.defimg;
			}
		}else{
			this.thumbcand = null;
			var url = Mut.obj.get_oneuri(rf);
			if(!url) return  {"error": "no image resouce"};
			else if(url === "rdf:nil") url = this.mia.const.noimage;
			else if(url.match(/example\.(org|net|com)\/(.*)$/)) url = "/works/2016/pub/images/" + RegExp.$2;
			else if(!url.match(/^http/)) url = Mut.uri.resolve(url);
			loct[3] = url;
			tsource = {"type": "image", "url": url, "canvas": this.cv[this.a.id]};
		}
		var opts = this.check_tile_options(r, rf, loct[0], styles);
		if(opts){
			if(tsource.tileSource) Mut.obj.merge(opts, tsource);
			else opts.tileSource = tsource;
			return opts;
		}else{
			return tsource;
		}
		function check_levels(s, that){
			var level = {"imgapi": 0.1, "compliance": 0, "defimg": "default.jpg"};
			if(s["@context"]) level.imgapi = that.get_api_level(s["@context"]);
			if(level.imgapi < 2) level.defimg = "native.jpg";
			if(s.profile){
				var prof = (s.profile instanceof Array) ? s.profile[0] : s.profile;
				if(typeof(prof)==="string" && prof.match(/level(\d)/)) level.compliance = Number(RegExp.$1);
			}
			return level;
		}
	},
	get_api_level: function(ctx){
		if(ctx.match(/\/([\d\.]+)\/context.json$/)) return Number(RegExp.$1);
		else if(ctx.match(/\/level([\d\.]+)\.json$/)) return Number(RegExp.$1);
		else return 0.1;
	},
	check_tile_options: function(r, rf, bound, styles){
		var frag, count = 0, res = {};
		if(bound){
			res.fitBounds = bound;
			count++;
		}
		var loc = r.selector ? Mut.frag.parse_selector(r) : Mut.frag.parse_uri(r[this.a.id]);
		if(loc[1]){
			res.clip = Muib.tool.pix2osdRect(loc[1]);
			count++;
		}
		var m = r[this.a.id] ? r[this.a.id].match(/\/([\d\.\-]+)\/(default|native).jpg$/) : null;
		if(m && m[1] !== "0"){
			res.degrees = Number(m[1]);
			count++;
		}else if(styles){
			if(styles.chars && styles.chars.match(/rotate\(([\d\.\-]+)deg\)/)){
				res.degrees = Number(RegExp.$1);
				count++;
			}
		}
		
		if(this.cv.thumbnail){
			res.referenceStripThumbnailUrl = Mut.obj.get_oneuri(this.cv.thumbnail);
			count++;
		}
		return count ? res : null;
	},
	set_canvas_meta: function(obj){
		var meta = "", mar = [],
		more = {"seealso": "See also", "related": "Related", "rendering": "Rendering", "within": "Within"};
		if(obj.metadata) meta = Muib.meta.set_metalist(obj.metadata);
		Object.keys(more).forEach(function(key){
			Muib.meta.set_val_data(mar, obj[key], more[key]);
		});
		meta += Muib.meta.gen_dtdd(mar);
		if(meta) this.cinfo.metadata = "<dl>\n" + meta + "</dl>";
		Muib.state.count.imgmeta++;
	},
	content_annot: function(oth, uri){
		if(oth.resources){
			this.iiif.proc_one_embed(oth.resources[0], this.annot, 0);
		}else{
			if(!this.mia.cinfo[uri].other) this.mia.cinfo[uri].other = [];
			this.mia.cinfo[uri].other.push(oth[this.a.id] || oth);
		}
		this.iiif.otherc++;
	},
	
	
	timed_canvas: function(cv){
		var ci = this.cinfo;
		ci.duration = cv.duration;
		ci.trange = [this.info.accum_dur];
		this.info.accum_dur += cv.duration;
		ci.trange.push(this.info.accum_dur);
		if(this.full_imgs === 0) adjust_av_layer(this);
		
		function adjust_av_layer(that){
			var layer = ci.layer,
			filler = "/works/2016/pub/images/filler?x=" + (cv.width || 600) + "&y=" + (cv.height || 400),
			filler_tile = {"type": "image", "url": filler},
			tile;
			if(ci.imgurl){
				tile = that.tile;
				that.tile = null;
			}else{
				tile = filler_tile;
			}
			if(layer){
				layer[0].tile = tile;
				layer.unshift({"tile": null, "label": "filler", "tid": filler});
			}else layer = [{"tile": tile}];
			
			if(that.iiif.cvs.num > 1){
				that.tile = filler_tile;
				Miiif.cvs.fillers++;
			}
		}
	},
	
	proc_missing: function(){
		this.tile = {"type": "image", "url": this.mia.const.noimage, "canvas": this.cvuri};
	}
	
};

//////// static method

Canvas.set_mf = function(cvins, mf, loc, tfrag, bodypos, bodyt, format, timeMode){
	if(loc){
		mf.loc = "#xywh=" + loc;
		mf.pos = Mut.arr.of_nums(loc);
		mf.orgp = Mut.arr.of_nums(loc);
		if(cvins) cvins.iiif.locfmedia++;
	}
	if(tfrag){
		mf.t = Mut.arr.of_nums(tfrag);
		if(cvins){
			cvins.cinfo.timedlayer = true;
			cvins.iiif.tfmedia ++;
			cvins.durmax = Math.max(mf.t[1], cvins.durmax);
		}
	}
	if(bodypos) mf.bodypos = Mut.arr.of_nums(bodypos);
	if(bodyt) mf.bodyt = Mut.arr.of_nums(bodyt);
	if(format) mf.format = format;
	if(timeMode) mf.timeMode = timeMode;
};

var Muib = {
	state: {
		pos: 0,
		loading: false,
		loadinfo: [],
		is_error: false,
		nvshown: false,
		struct: false,
		colthumb: null,
		dotimer: null,
		uribase: null,
		narrowscrn: null,
		paged_zoom: null,
		osdv_org_h: null,
		is_fading: false,
		count: {
			user: 1,
			load_failed: 0, 
			imgmeta: 0,
			subobj: 0,
			test: 0
		},
	}, 
	appb: {
		msg: {
			log: [],
			count: 0, 
			current: "",
		},
		loadStart: false,
		fname_h1: false,
		h1: null,
		set_h1: function (bodyclass, override){
			var h1, h1s = Mut.dom.get("h1");
			if(h1s){
				h1 = h1s[0];
			}else{
				h1 = Mut.dom.elt("h1");
				Mia.elt.maindiv.insertBefore(h1, Mia.elt.maindiv.firstChild);
			}
			this.h1 = h1;
			if(bodyclass===false){
				;//何もクラスを設定しない
			}else if(bodyclass){
				document.body.classList.add(bodyclass);
				if(!override) document.body.classList.add("iaview");
			}else document.body.classList.add("iaview");
			
			if(Mia.ent.label) {
				if(Mia.opts.v.inf){
					h1.innerHTML = Mut.html.trim_text(Mia.ent.label, "mid", true);
					var p = window.parent;
					if(h1.firstChild.data === "Image Annotator"){
						p.document.title = Mia.ent.label;
					} else {
						p.document.title += " : " + Mia.ent.label + " - Image Annotator";
					}
				}else{
					h1.innerHTML = "";
					document.title = Mia.ent.label + " - Image Annotator";
					if(Mia.ent.logo){
						var logo = Mut.dom.elt("img", "", [["src", Mia.ent.logo], ["class", "logo"]]);
						h1.appendChild(logo);
					}
					h1.innerHTML += Mut.html.fold_text(Mia.ent.label, "mid");
				}
			}else{
				if(Miiif.use && Mpj.type !== "info.json" && !Muib.state.is_error) console.warn("No label in manifest");
				if(Mia.opts.base){
					var filename = Mut.uri.filename(Mia.opts.base).replace(/_/g, " ").replace(/\.\w{1,4}$/, "");
					document.title += " : " + filename;
					h1.innerHTML += " : " + filename;
					this.fname_h1 = true;
				}
			}
		},
		set_msg: function (msg, cls, wait, msgbox){
			var elt = msgbox || Mia.elt.msg,
			that = this;
			if(cls === "logonly"){
				this.msg.log = Mut.arr.circular(this.msg.log, msg, 30, 20);
				return;
			}else if(cls) setup_class(cls);
			if(msg === "") return;
			if(cls !== "error") this.msg.current = msg;
			var op = (typeof(cls) === "string" && cls.substr(0, 5) === "error") ? 1 : 0.7;
			elt.innerHTML = msg.replace(/\.\.\.$/, "<img src=\"./parts/loading-c.gif\"/>");
			if(msg.substr(0, 4) === "done"){
				if(this.msg.count++ > 50){
					this.msg.count = 0;
					throw "too many done message";
				}
				setup_class("normal");
				this.msg.log = Mut.arr.circular(this.msg.log, msg, 30, 20);
				wait_msg(msg, wait || 500, "done", op);
			}else if(wait){
				wait_msg(msg, wait, cls, op);
			}else{
				elt.style.opacity = op;
				if(cls === false) msg = "message displayed";
				this.msg.log = Mut.arr.circular(this.msg.log, msg, 30, 20);
				if(typeof(cls) === "string" && cls.match(/layer$/)) Muib.tool.fadeio(elt, 1000, op);
				else if(cls === "normal") this.set_status("auto");
			}
			function setup_class(cls){
				elt.className = (cls === "normal") ? "msg" : "msg " + cls;
			}
			function wait_msg(msg, wait, cls, op){
				var sid = setInterval(function(){
					if(cls === "onemore"){
						Muib.tool.fadeio(elt, 200, op, undefined, 0);
						cls = "normal";
					}else if(cls !== "done" && that.msg.current === msg){
						if(elt.style.opacity === 0) Muib.tool.fadeio(elt, 100, 0, undefined, op);
					}
					if(cls === "done"){
						cls = "onemore";
					}else{
						if(cls === "normal") Muib.appb.set_status("auto");
						clearInterval(sid);
						setTimeout(function(){
							if(elt.innerHTML.substr(0, 4) === "done" && that.msg.current === msg && elt.opacity === 1){
								console.warn("done massage not fade out");
								elt.opacity = 0;
							}
						}, 1000);
					}
				}, wait);
			}
		},
		set_status: function (status){
			if(status === "wait"){
				document.body.classList.add("wait");
			}else if(status === "load"){
				this.loadStart = true;
			}else if(status === "loadcheck" && this.loadStart){
				document.body.classList.add("wait");
				this.loadStart = false;
			}else if(status === "auto"){
				document.body.classList.remove("wait");
				this.loadStart = false;
			}
		}
	},
	
	meta: {
		lang: {watch: false, opts: {}, selector: "", selected: ""},
		added: false,
		div: {
			meta: {id: "metap", label: "metadata", m: {}, count:0, show: false},
			link: {id: "linkp", label: "link properties", m: {}, count:0, show: false}
		},
		linkp : {"seeAlso": "See also", "homepage": "Homepage", "related": "Related", "rendering": "Rendering", "within": "Within"},
		temp: {"meta": {}, "link": {}}, 
		nump: 0,
		add: function (def){
			this.lang.watch = true;
			var pa, pid = "docdsc", metadiv;
			if((pa = Mut.dom.get(pid, "id"))){
				Mia.elt.maindiv.removeChild(pa);
				pa.innerHTML = "";
			}else{
				pa = Mut.dom.elt("div", "", [["class", "metainfo"], ["id", pid]]);
			}
			for(var key in this.div){
				if(this.temp[key].m){
					this.div[key].count += this.temp[key].count;
					Object.assign(this.div[key].m, this.temp[key].m);
				}
			}
			Mia.elt.docmeta = pa;
			this.added = this.generate(def, pa);
			Mia.elt.maindiv.appendChild(pa);
			for(var key in this.div){
				if(this.div[key].show && (metadiv = Mut.dom.get(this.div[key].id, "id"))) Muib.tool.toggleobj(metadiv.firstChild);
			}
			this.lang.watch = false;
		},
		reset_lang: function(lang){
			Mut.str.preflang = this.lang.selected = lang;
			var Mdiv = {};
			proc_mdiv(this, "record");
			Mpj.set_ent_meta(Mia.jsource);
			Muib.appb.set_h1();
			Mia.elt.docmeta.innerHTML = "";
			this.generate(Mia.jsource, Mia.elt.docmeta);
			proc_mdiv(this, "restore");
			function proc_mdiv(that, what){
				for(var key in that.div){
					if(!Mdiv[key]) Mdiv[key] = {};
					Mdiv[key].elt = Mut.dom.get(that.div[key].id, "id");
					if(Mdiv[key].elt){
						if(what === "record"){
							Mdiv[key].expander = Mdiv[key].elt.firstChild.className;
						}else{
							if(Mdiv[key].expander === "closer")
							Muib.tool.toggleobj(Mdiv[key].elt.firstChild);
						}
					}
				}
			}
		},
		generate: function(def, pa){
			var links = "", more = "", ShowMeta = false, logo;
			this.nump = 0;
			for(var key in this.temp) this.temp[key] = {m: {}, count:0};

			if(Mia.ent.description){
				links = this.mlist("Description", Mut.html.fold_text(Mia.ent.description));
				this.nump++;
			}
			if((logo = Mut.get_first(def.logo))) Mia.ent.logo = logo[Miiif.a.id] || logo;
			links += gen_text_li(def.attribution, "Attribution", this);
			links += gen_lvtext_li(def.requiredStatement, this);
			links += this.set_objlink(def.rights, "Rights");
			links += this.set_objlink(def.license, "License"); //See issue #644 Change "license" to "rights"
			links += this.set_objlink(def["rdfs:seeAlso"], "See also");
			if(Miiif.use){
				var dl = this.set_linkprops(def),
				seq = Miiif.usedSeq;
				if(!dl && seq) dl = this.set_linkprops(seq);
				if(dl) more = gen_togglerdl(dl, this.div.link, this);
				dl = this.set_metalink(def.metadata);
				if(!dl && seq && seq.metadata) dl = this.set_metalink(seq.metadata);
				if(dl) more += gen_togglerdl(dl, this.div.meta, this);
				
				
			}
			if(Mia.opts.v.inf) Mut.dom.append(Mia.elt.maindiv, 
				Mut.dom.ashtml(this.set_toggler(" ", "Show document info")).firstChild
			);
			var lang_selector = this.lang.selector || setup_selector(this);
			pa.innerHTML = "<em>Document info <a href=\""+ Mia.opts.v.u + 
			"\">" + Mpj.type.toLowerCase() + "</a></em>" + lang_selector + ":";
			pa.innerHTML += (links ? "<dl>" + links + "</dl>" : "") + more;
			return links ? true : false;

			function gen_togglerdl(dl, div, that){
				return "<div id=\"" + div.id +"\">" + 
				that.set_toggler((div.show ? "" : "show ") + div.label, "") +
				"<dl class=\"more\">\n" + dl + "</dl>\n</div>\n";
			}
			function set_attribution(text, that){
				var mlabel, more = Mia.ent.logo ? 
				" <img src=\"" + Mia.ent.logo + "\" class=\"logo\"/>" : "";
				if((mlabel = text ? "Attribution" : (more ? "Logo" : null))){
					return gen_text_li(text, mlabel, that, more);
				}else{
					return "";
				}
			}
			function gen_lvtext_li(obj, that){
				if(!obj) return "";
				var res = that.get_lv_pair(obj);
				return gen_text_li(res.value, res.label, that);
			}
			function gen_text_li(text, mlabel, that, more){
				if(!text) return "";
				that.nump++;
				return that.mlist(
					mlabel, 
					Mut.html.fold_text(Mut.html.safe_text(text)) + (more || "")
				);
			}
			function setup_selector(that){
				var langopts = Object.keys(that.lang.opts);
				if(langopts.length < 2) return "";
				var selector = " <select onchange=\"Muib.meta.reset_lang(this.options[this.selectedIndex].value);\">";
				langopts.forEach(function(lng){
					selector += "<option" + (lng === that.lang.selected ? " selected>" : ">") + lng + "</option>";
				});
				return selector + "</select>";
			}
		},
		set_linkprops: function (def){
			var more = {}, count = 0, link = "";
			for(var prop in this.linkp) count += this.set_val_data(this.temp.link.m, def[prop], this.linkp[prop]);
			count += this.test_service(this.temp.link.m, def.service);
			if(count === 0) return "";
			this.temp.link.count += count;
			this.nump += count;
			link += this.gen_dtdd(this.temp.link.m, this.div.link.m);
			this.div.link.show = (count > 2 && this.nump > 5) ? false : true;
			return link;
		},
		set_metalink: function (obj){
			if(!obj && this.div.meta.count === 0) return "";
			var dl = this.set_metalist(obj, this.temp.meta, this.div.meta.m);
			if(this.temp.meta.count < 3 || this.nump + this.temp.meta.count < 6) this.div.meta.show = true;
			return dl;
		},
		set_metalist: function(meta, tg, saved){
			var res;
			if(!tg) tg = {m:{}, count:0};
			meta.forEach(function(item){
				if((res = this.get_lv_pair(item))){
					tg.count++;
					Mut.arr.add(tg.m, res.label, res.value);
				}
			}, this);
			return saved === false ? tg.m : this.gen_dtdd(tg.m, saved);
		},
		get_lv_pair: function(item){
			var val;
			if((val = Mut.html.str_or_link(Mut.html.safe_text(item.value))))
			return {"label": Mut.str.lang_val(item.label) || "(anon)", "value": val};
			else return null;
		},
		gen_dtdd: function(meta, saved){
			var dl = "";
			if(Object.keys(meta).length) for(var prop in meta){
				dl += this.mlist(prop, meta[prop].join("</dd><dd>"));
			}
			if(saved && Object.keys(saved).length) for(var prop in saved){
				dl += this.mlist(prop, saved[prop].join("</dd><dd>"));
			}
			return dl;
		},
		mlist: function(label, val){
			return "<div><dt>" + label + "</dt><dd>" + val + "</dd></div>\n";
		},
		lilist: function(label, val){
			return "<li><strong>" + label + "</strong>: " + val + "</li>\n";
		},
		set_val_data: function(metaar, obj, label){
			if(! obj) return 0;
			var val, res = [];
			if(! (obj instanceof Array)) obj = [obj];
			obj.forEach(function(o){
				if((val = Mut.html.get_text_link(o))){
					res.push(val);
				}
			}, this);
			if(res.length) metaar[label] = res;
			return res.length;
		},
		set_objlink: function(obj, label){
			if(!obj) return "";
			var metaar = {};
			this.set_val_data(metaar, obj, label);
			return this.gen_dtdd(metaar);;
		},
		set_toggler: function(label, ttlattr){
			if(ttlattr) ttlattr = " title=\"" + ttlattr + "\"";
			return "<span" + ttlattr + " class=\"opener\" onclick=\"Muib.tool.toggleobj(this);\">" + label + "</span>";
		},
		set_more_prop: function(def){
			var dl = "";
			for(var prop in this.linkp){
				if(def[prop] && !this.temp.link.m[prop]){
					this.set_val_data(this.temp.link.m, def[prop], prop);
					dl += this.mlist(this.linkp[prop], this.temp.link.m[prop]);
				}
			}
			if(dl) Mut.dom.select("#linkp dl").innerHTML += dl;
		},
		test_service: function(more, sv){
			if(!sv) return 0;
			if(!(sv instanceof Array)) sv = [sv];
			more["Service"] = [];
			var searchapipat = new RegExp(Mpj.ctxs.iiif_s + "[\\d\\.]+/search$");
			sv.forEach(function(s){
				var val = Mut.html.safe_str(s[Miiif.a.id] || s);
				if(s.profile){
					var prof = Mut.get_first(s.profile);
					if(prof.match(searchapipat)){
						Miiif.searchs.setup(s);
						val += " (Search API. See query box↑)";
					}else val += " (profile: " + Mut.uri.filename(prof) + ")";
				}
				more["Service"].push(val);
			});
			return sv.length;
		}
	},

	update_page: {
		anno: function (prevuri, newuri){
			if(Manno.use_avanno) return newuri;
			if(prevuri === newuri || Miiif.cview.noannot) return newuri;
			if(prevuri){
				Manno.proc_prevpage(prevuri, newuri);
				Mia.tindex.update(prevuri);
			}else{
				Muib.state.pos = Mia.get_pos();
			}
			Manno.edit = false;
			if(newuri){
				Manno.proc_newpage(newuri); 
				this.imgdesc(newuri);
			}
			Muib.appb.set_status("auto");
			return newuri;
		},
		imgdesc: function(uri, disp, stepfade){
			var info, ci = Mia.cinfo[uri],
			label = "<em title=\"" + ci.urisig + "\"" +
			(Mav.type ? ">Media" : " onclick=\"Mia.ask_image(event);\">Image") + " info</em>: ";//⇣❦❣
			if(disp){
				if(stepfade) disp = "<span id=\"stepfade\">" + disp + "</span>";
				info = label + disp;
			}else if(ci){
				if(ci.description && ci.description !== undefined) {
					info = label + 
					disp_desc(ci.description + Miiif.cview.append_paged_val(uri, "description")).
					replace(/^✍/, "<span class=\"otherCont\">✍</span>");
				}else if (Mia.env.numTiles > 1){
					info = label;
				}
				if(ci.metadata){
					info += ci.metadata;
					if(!Miiif.curation){//curationは文書メタがほぼないので、.curationを加えimgannot.cssでautoにしておく
						Mia.elt.imgdsc.style.overflowY = "scroll";
						Mia.elt.imgdsc.style.maxHeight = "15em";
					}
				}else if(Muib.state.count.imgmeta){
					Mia.elt.imgdsc.style.overflowY = "auto";
					Mia.elt.imgdsc.style.maxHeight = "none";
				}
			}
			if(info) Mia.elt.imgdsc.innerHTML =  info;
			if(stepfade) Muib.tool.step_bgcolor(Mut.dom.get("#stepfade"), 500, [253,246,222], "transparent", 10);
			
			function disp_desc(text){
				if(text.match(/</)) return text;
				else return Mut.html.fold_text(text, "long");
			}
		},
		
		subcanvas: function(cinfo, prevuri, newuri){
			var that = this, 
			prevcinfo = (prevuri && prevuri !== newuri) ? Mia.cinfo[prevuri] : null,
			dojob = function(){
				if(cinfo.subcanvases) cinfo.subcanvases.forEach(show);
			}
			if(!window.Subcanvas) Muib.tool.load_script("avannot.js", true).onload = dojob;
			else dojob();
			
			function show(uri){
				var subcinfo = Mia.cinfo[uri];
				if(!subcinfo.cvinst){
					Mav.cinfo = cinfo;
					Mav.vinfo.dim = {x: Mia.elt.osdv.clientWidth, y: Mia.elt.osdv.clientHeight};
					Mav.gen_elt(uri, uri, cinfo.mf[uri][0]);
					subcinfo.cvinst.osdv.elt.style.display = "block";
				}else{
				}
			}
			function hide(uri){
				var prevsubcinfo = Mia.cinfo[uri];
				prevsubcinfo.cvinst.osdv.elt.style.display = "none";
			}
		},
		medias: function(cinfo, prevuri, newuri){
			var that = this;
			if(cinfo.mf) Object.keys(cinfo.mf).forEach(function(uri){
				cinfo.mf[uri].forEach(function(obj){
					if(obj.ovlelt) retouch_overlay(obj);
					else proc_new(obj, uri)
				});
			});
			function proc_new(obj, uri){
				var osdv;
				switch(obj.type){
				case "ThreeD":
					osdv = gen_elt(obj);
					Muib.state.test3d = Muib.threed.load(uri, obj.format);
					Muib.threed.setup_osd_zoom(osdv.elt, Mia.osdv.viewer);
					Muib.threed.setup_osd_rotate(osdv.elt, null);
					
					break;
				}
			}
			function gen_elt(obj){
				var osdv = new OSDV(null, "obj" + Muib.state.count.subobj++),
				rect = Muib.tool.pix2viewportRect(obj.orgp, cinfo.dim.x);
				Mia.osdv.viewer.addOverlay(osdv.elt, rect);
				obj.ovlelt = osdv.elt;
				obj.rect = rect;
				return osdv
			}
			function retouch_overlay(obj){
				Mia.osdv.viewer.addOverlay(obj.ovlelt, obj.rect);
			}

		}
	},
	
	
	jldpanel: {
		btnlabel: " WebAnnot",
		showbtn: function (action){
			if(!Mia.elt.jldb) return false;
			if(action === "selector"){
				if(Mia.env.is_touch_dev) Mia.elt.jldb.firstChild.data = "Close selector";
				Mia.elt.jldb.style.display = "inline";
			}else if(action){
				Mia.elt.jldb.firstChild.data = action + this.btnlabel;
			}else{
				Mia.elt.jldb.style.display = "inline";
				if(!Miiif.searchs.has_result)
				Muib.annobox.btn.style.display = "inline";
			}
		},
		toggle: function (o, id){
			var jldarea = Mia.elt.jldarea;
			var btn = o ? o : Mut.dom.get(id, "id");
			var label = btn.firstChild;
			if(label.data.substr(0, 5) === "Close"){
				Mia.osdv.viewer.antctrl.cancel_anno_selector();
				label.data =  "Show" + this.btnlabel;
			}else if(label.data.substr(0, 4) === "Show"){
				Muib.appb.set_msg("converting annotations...", "annot");
				var as_page_chbx = {"checked": false},
				ev = window.event;
				jldarea.value = "";
				jldarea.style.display = "block";
				jldarea.value = (ev && ev.ctrlKey) ? Manno.anno2oa.get_all_tabtext() :
				JSON.stringify(Manno.anno2oa.get_all(as_page_chbx), null, 4);
				Muib.appb.set_msg("done conversion");
				label.data = "Hide" + this.btnlabel;
				Mia.osdv.viewer.antctrl.cancel_anno_selector();
			}else{
				jldarea.style.display = "";
				label.data =  "Show" + this.btnlabel;
			}
		}
	},
	clip: {
		btn: null, ctl: null, allimg: null, area: null,
		btname: "Anno List",
		maxw: null,
		init_elt: function(jldctrl){
			if(!Mia.elt.jldb) return false;
			this.btn = Mut.dom.elt("button", "Show " + this.btname);
			this.btn.onclick = function(){Muib.clip.toggle();};
			this.ctl = Mut.dom.elt("span");
			this.ctl.style.display = "none";
			this.allimg = Mut.dom.elt("input", "", [["type", "checkbox"]]);
			Mut.dom.append(this.ctl, [this.btn, " ", 
				Mut.dom.append( Mut.dom.elt("label"), [this.allimg, "all pages"])]); 
			Mut.dom.append(jldctrl, [" ", this.ctl]);
			this.area = Mut.dom.get("#annoclip");
		},
		showctrl: function(showhide){
			if(!Mia.elt.jldb) return false;
			if(Miiif.cview.paged) showhide = false;
			if(showhide === true){
				if(!Miiif.searchs.has_result)
				this.ctl.style.display = "inline";
			}else{
				this.ctl.style.display = "none";
			}
		},
		toggle: function (forceHide){
			if(!this.area) return false;
			if(!this.btn){
				console.warn("no annotation button");
				return false;
			}
			var label = this.btn.firstChild;
			if(label.data.substr(0, 4) === "Hide" || forceHide){
				this.area.style.display = "none";
				label.data =  "Show " + this.btname;
				this.allimg.disabled = false;
			}else{
				this.gen_annoclip(this.area, this.allimg.checked);
				this.area.style.display = "flex"; //"block";
				label.data = "Hide " + this.btname;
				this.allimg.disabled = true;
			}
		},
		gen_annoclip: function (parnt, allimg){
			var fbox = "";
			if(!this.maxw) this.maxw = Manno.maxgw < 0.06 ? window.innerWidth * 2 : window.innerWidth;
			if(allimg){
				var uri;
				for(uri in Manno.page){
					if(Miiif.level.compliance >= 1) Manno.page[uri].forEach(function(a){fbox += as_iiif(a, uri);});
					else Manno.page[uri].forEach(function(a){fbox += as_css(a, uri);});
				}
			}else{
				var an = Mwa.antrs.getAnnotations();
				if(Miiif.level.compliance >= 1) an.forEach(function(a){fbox += as_iiif(a, Mia.env.keyuri);});
				else an.forEach(function(a){fbox += as_css(a, Mia.env.keyuri);});
			}
			parnt.innerHTML = fbox;
			
			function as_css(an, uri){
				var dim, usefixed;
				if(Mia.cinfo[uri].imgurl){
					dim = {"x": 1000};
					uri = Miiif.full2mid(Mia.cinfo[uri].imgurl, dim.x);
					usefixed = true;
				}else{
					dim = Mia.env.dim;
					usefixed = false;
				}
				var pos = an.pix || Mwa.ratio2px(an, dim, usefixed),
				rect = [pos[1], pos[0]+pos[2], pos[1]+pos[3], pos[0]],
				text = Mut.html.attr_safe(an.text);
				return "<figure>" +
				"<div class=\"clip\" style=\"height:"+pos[3]+"px;width:"+pos[2]+"px;\">"+
				"<img src=\""+uri+"\" style=\"clip:rect(" + rect.join("px,") + "px);"+
				"margin-top:-" + pos[1] + "px;margin-left:-" + pos[0] + "px;\"/></div>"+
				"<figcaption title=\"" + text + "\">" +
				Mut.html.trim_text(text, "short") +
				"</figcaption></figure>\n";
			}
			
			function as_iiif(an, uri, dimx){
				var frag, pos;
				if(an.fragid && an.fragid.substr(5,1) !== "p"){
					frag = an.fragid.substr(5);
					pos = frag.split(",");
				}else{
					pos = an.pix || Mwa.ratio2px(an, Mia.env.dim, false);
					frag = pos.join(",");
				}
				var maxw = pos[2] > 200 ? "200," : "full",
				imguri = Miiif.full2mid(Mia.cinfo[uri].imgurl, maxw, frag),
				text = Mut.html.attr_safe(an.text);
				return "<figure>" +
				"<div><img src=\"" + imguri + "\" /></div>"+
				"<figcaption title=\"" + text + "\">" +
				Mut.html.trim_text(text, "short") +
				"</figcaption></figure>\n";
			}
		}
	},
	
	annobox: {
		btn: null,
		btname: "Annotation",
		show: true,
		pendingUri: null,
		init_elt: function(jldctrl){
			this.btn = Mut.dom.elt("button", "Hide " + this.btname);
			this.btn.onclick = function(){Muib.annobox.toggle();};
			this.btn.style.display = "none";
			Mut.dom.append(jldctrl, [" ", this.btn]);
		},
		toggle: function (){
			var label = this.btn.firstChild;
			if(this.pendingUri){
				Miiif.add_other_content(this.pendingUri);
				label.data = "Hide " + this.btname;
				this.show = true;
				this.pendingUri = null;
			}else if(this.show === true){
				Mia.osdv.elt.classList.add("hideanno");
				label.data =  "Show " + this.btname;
				this.show = false;
			}else{
				Mia.osdv.elt.classList.remove("hideanno");
				label.data = "Hide " + this.btname;
				this.show = true;
			}
		},
		ready: function(cond){
			this.pendingUri = null;
			this.btn.disabled = cond;
		},
		oth: function(tguri){
			if(this.btn.style.display === "none") Muib.jldpanel.showbtn();
			this.pendingUri = tguri;
			this.btn.firstChild.data = "Load " + this.btname;
			this.btn.disabled = false;
		},
		searchres: function(){
			this.btn.style.display = "none";
			Muib.clip.showctrl(false);
		}
	},
	
	threed: {
		load: function(url, type, container, panel_pelt, annot, info, three){
			if(!window.THREE){
				var params = {
					three_dir: Mia.const.threejs_path,
					appb: Muib.appb,
					msgbox: [url, container.msgbox]
				}; 
				Muib.tool.load_script("threedee.js", true).addEventListener("load", function(){
					container.three = new M3D({
						container: container || Mia.osdv.elt,
						url: url,
						type: type,
						params: params,
						panel_pelt: panel_pelt,
						oa_annot: annot,
						mtl_img: Mia.opts.v.mtlimg,
						camera_pos: info.camera_pos ? info.camera_pos.split(/,\s*/) : (
							Mia.opts.v.reverse==="on" ? "reverse" : null)
					});
				});
				window.onload = add_credit;
			}else {
				if(!three) threed = new M3D(container);
				M3D.params.msgbox[url] = container.msgbox;
				thee.load(url, type);
				return three;
			}
			
			function add_credit(){
				var crdelt = Mut.dom.get("#cif-credit");
				if(crdelt && !crdelt.innerText.match(/three\.js/)) crdelt.innerHTML += " 3D rendering by <a href=\"https://threejs.org/\">three.js</a>.";
			}
		},
		proc_single3d: function(res){
			Mia.elt.osdv.className = "view";
			var keyuri = Mia.keyuris[0],
			annot = res.anno ? res.anno[keyuri] : null,
			cinfo = Mia.cinfo[keyuri];
			this.load(
				res.info.url, res.info.format,
				Mia.elt.osdv,
				Mia.elt.maindiv,
				annot,
				res.info
			);
			Muib.appb.set_h1("threed", false);
			if(cinfo && cinfo.description) this.imgdesc(keyuri);
			else Mia.elt.imgdsc.style.display = "none";
		},
		setup_osd_zoom: function(tgelt, pviewer){
			var that = this;
			pviewer.addHandler("zoom", function(e){
				tgelt.dispatchEvent(new Event("canvas-zoom"));
			});
			pviewer.addHandler("viewport-change", function(e){
				tgelt.dispatchEvent(new Event("canvas-vp-change"));
			});
			pviewer.addHandler("animation-finish", function(e){
				tgelt.dispatchEvent(new Event("canvas-animation-finish"));
			});
			pviewer.gestureSettingsMouse.clickToZoom = false;
		},
		setup_osd_rotate: function(tgelt, pviewer){
			if(pviewer) pviewer.addHandler("canvas-press", function(e){
				tgelt.dispatchEvent(new MouseEvent("canvas-mousedown", e) );
			});
			else tgelt.addEventListener("pointerdown", function(e){
				e.cancelBubble = true;
				tgelt.dispatchEvent(new MouseEvent("mousedown", e));
			}, false);
			tgelt.addEventListener("mousemove", function(e){
				e.cancelBubble = true;
				document.dispatchEvent(new MouseEvent("mousemove", e));
			}, false);
			tgelt.addEventListener("pointerup", function(e){
				e.cancelBubble = true;
				document.dispatchEvent(new MouseEvent("mouseup", e));
			}, false);
		},
	},
	pdf: {
		inst: null,
		load: function(url, anno){
			if(!this.inst){
				var that = this;
				Mia.elt.osdv.className = "view";
				Muib.tool.load_script("pdeef.js", true).addEventListener("load", function(){
					Muib.appb.set_h1("pdf");
					that.inst = new MPDF(Mia.elt.osdv, url, Mia.opts.v.page);
				});
			}else this.inst.load(url);
			var keyuri = Mia.keyuris[0],
			annot = anno ? anno[keyuri] : null,
			cinfo = Mia.cinfo[keyuri];
			if(cinfo && cinfo.description) this.imgdesc(keyuri);
			else Mia.elt.imgdsc.style.display = "none";
		}
	},
	annopop: {
		proc_click: function (ev){
			var obj;
			if(window.event) obj = event.srcElement;
			else if(ev) obj = ev.target;
			if(obj.nodeType===3) obj = obj.parentNode;
			if(obj.nodeName.toLowerCase()==="a"){
				var dest = obj.getAttribute("href");
				if(dest && dest.charAt(0)==="#"){
					var moved = null, 
					ds = obj.getAttribute("data-source"), anid = obj.getAttribute("data-anid");
					if(dest.match(/^#p(\d+)/)){
						moved = go(Number(RegExp.$1) - 1, this);
					}else if(dest === "#!next"){
						moved = go(null, +1, ds, this);
						setTimeout(function(){Muib.annopop.show_one(0, moved, anid);}, 300);
					}else if(dest === "#!prev"){
						moved = go(null, -1, ds, this);
						setTimeout(function(){Muib.annopop.show_one(-1, moved, anid);}, 300);
					}
					if(moved !== null) return false;
				}
			}
			function go(page, offset, ds, that){
				if(offset){
					if(Miiif.cview.paged){
						var cvid = Miiif.map[ds] || ds, ci = Mia.cinfo[cvid];
						if(ci){
							if(ci.layer){
								if(offset === 1) return false;
							}else if(offset === -1) return false;
						}
					}
					page = Muib.state.pos + offset;
				}
				Mia.osdv.goTo(Mia.get_pos(page));
				return true;
			}
		},
		show_one: function (idx, moved, anid){
			if(Miiif.cview.paged && !moved){
				Manno.current.forEach(function(an, i){
					if(an.id === anid){
						idx = idx === 0 ? i + 1 : i + idx;
						return;
					}
				});
			}else if(idx === -1) idx += Manno.current.length;
			Mwa.antrs.highlightAnnotation(Manno.current[idx]);
		},
		
		add_more: function (text, whoid, i){
			var who = " <em class=\"who\"" + 
			(typeof(i) !== "undefined" ? " onclick=\"Manno.flipuser(" + i + ");\"" : "") +
			">(" + (at.whoswho[whoid] ? at.whoswho[whoid].dispname : whoid) + ")</em>";
			Mia.elt.popbox.innerHTML = Mia.elt.popbox.innerHTML ?
			Mia.elt.popbox.innerHTML + (
				text ? "<div class=\"more\">" + text + who + "</div>" : who
			) : (text ? text + who : who);
		},
	},
	tool: {
		toggleobj: function (o, checker, to_open){
			var tg = o.nextSibling;
			if(to_open === undefined) to_open = o.className === "opener";
			if(typeof(checker) === "string"){
				do{
					if(tg.nodeType === 1 && tg.nodeName.toLowerCase() === checker) break;
					tg = tg.nextSibling;
				}while(tg)
			}
			var label = o.innerText,
			type = label.match(/^(more|less)/) ? 1 : (label.match(/^(show|hide)/) ? 2 : 0);
			if(to_open){	//o.className === "opener"
				tg.style.display = "block";
				if(type === 1) o.innerText = label.replace(/^more/, "less");
				else if(type === 2) o.innerText = label.replace(/^show/, "hide");
				o.className = "closer";
			}else{
				tg.style.display = "none";
				if(type === 1) o.innerText = label.replace(/^less/, "more");
				else if(type === 2) o.innerText = label.replace(/^hide/, "show");
				o.className = "opener";
			}
			if(checker===true) Mia.tindex.get_bcr();
			var fid;
			if((fid = o.parentNode.getAttribute("data-fldr")))
			Miiif.collection.sate.set(fid, (o.className === "closer"));
		},
		expand: function (o){
			if(o.firstChild.data === " (less)"){
				o.previousSibling.style.display = "none";
				o.firstChild.data = "...(more)";
			}else{
				o.previousSibling.style.display = "inline";
				o.firstChild.data = " (less)";
			}
		},
		fadeio: function(elt, time, ov, z, to) {
			Muib.state.is_fading = true;
			var steps = time >= 100 ? 20 : 5,
			stept = time / steps,
			stepo = 1 / 20,
			lolim = 0,
			uplim = 1; 
			var set_opacity = function(opct){
				elt.style.opacity = opct;
			};
			if(ov > 0){
				stepo = 0 - stepo;
				if(typeof(to) !== "undefined") lolim = to;
			}else{
				setz();
				if(typeof(to) !== "undefined") uplim = to;
			}
			set_opacity(ov, this);
			var sid = setInterval(function(){
				ov = Number((ov + stepo).toFixed(12));
				if(ov < lolim){
					ov = lolim;
					clearInterval(sid);
					setz();
					Muib.state.is_fading = false;
				}else if(ov > uplim){
					ov = uplim;
					clearInterval(sid);
					Muib.state.is_fading = false;
				}
				set_opacity(ov);
			}, stept);
			function setz(){
				if(typeof(z) === "number") elt.style.zIndex = z;
			}
		},
		step_bgcolor: function(elt, time, bgc, to, stp){
			if(!stp) stp = 20;
			var stept = time / stp, sid = '', stepc =[], transp = false;
			if(to === "transparent"){
				transp = true;
				to = [255, 255, 255];
			}
			bgc.forEach(function(v, i){stepc[i] = (to[i] - v) / stp;});
			var set_color = function(bg){
				elt.style.backgroundColor = "rgb(" + bg.join(",") + ")";
			};
			set_color(bgc);
			sid = setInterval(function(){
				stepc.forEach(function(v, i){bgc[i] =Math.round(bgc[i] + v);});
				if((stepc[0] < 0 && bgc[0] < to[0]) ||
					(stepc[0] > 0 && bgc[0] > to[0])){
					bgc = to;
					clearInterval(sid);
				}
				set_color(bgc);
			}, stept);
			if(transp) elt.style.backgroundColor = "transparent";
		},
		do_after: function(after, fn) {
			if(Muib.state.dotimer){
				clearTimeout(Muib.state.dotimer);
			}
				Muib.state.dotimer = setTimeout(fn, after);
		},
		

		pix2osdRect: function(xywh){
			var loc = Mut.arr.of_nums(xywh);
			return new OpenSeadragon.Rect(loc[0], loc[1], loc[2], loc[3]);

		},
		pix2viewportRect: function(frag, dimx){
			return this.arr2viewportRect(Mut.arr.of_nums(frag), dimx);
		},
		arr2viewportRect: function(locarr, dimx){
			var loc = Mwa.px2ratio(locarr, {"x": dimx});
			return new OpenSeadragon.Rect(loc[0], loc[1], loc[2], loc[3]);
		},
		anntrs_array: function(pos, dim){
			if(pos.match(/^(pct|percent):(.*)/)){
				p = Mwa.pct2ratio(RegExp.$2.split(","));
			}else{
				p = Mwa.px2ratio(pos.split(","), dim || Mia.osdv.viewer.source.dimensions);
			}
			return p;
		},
		style_set: function(obj, set){
			for(var key in set){
				obj.style[key] = set[key];
			}
		},
		set_abspos: function(node, pos, resetMinW){
			node.style.left = pos[0] + "px";
			node.style.top = pos[1] + "px";
			node.style.width = pos[2] + "px";
			node.style.height = pos[3] + "px";
			if(resetMinW) node.style.minWidth = 0;
			else node.style.position = "absolute";
		},
		mvlink: function(obj){
			if(Miiif.collection.mdef){
				if(obj.innerText === "Mirador") obj.href +=  "&type=collection";
			}else if(Mia.env.numTiles > 1){
				var pos = Miiif.cview.sourcepos();
				if(pos) obj.href += (obj.innerText === "UViewer") ? "&cv="+ pos : "&canvas="+Mia.key_uri();
			}
		},
		load_script: function(src, use_libpath){
			var script = document.getElementById(src);
			if(!script){
				script = Mut.dom.elt("script","",[
					["src", (use_libpath ? Mia.const.libpath : "") + src],
					["id", src]]);
				Mut.dom.append(Mut.dom.get("head")[0], script);
			}
			return script;
		}
	}
};


var Mut = {
	dom: {
		elt: function(eltname, text, attrs){
			var elt = document.createElement(eltname);
			if(text) elt.appendChild(document.createTextNode(text));
			if(attrs){
				attrs.forEach(function(attr){
					elt.setAttribute(attr[0], attr[1]);
				});
			}
			return elt;
		},
		append: function(pelt, node){
			if(node instanceof Array)
				node.forEach(function(n){xappend(pelt, n);});
			else xappend(pelt, node);
			function xappend(p, c){
				if(c.nodeType === undefined) c = document.createTextNode(c);
				p.appendChild(c);
			}
			return pelt;
		},
		prepend: function(pelt, node){
			if(typeof(node) === "string") node = document.createTextNode(node);
			pelt.insertBefore(node, pelt.firstChild);
		},
		ashtml: function(text){
			if(text.match(/</)){
				var span = Mut.dom.elt("span");
				span.innerHTML = text;
				return span;
			}else{
				return text;
			}
		},
		get: function(key, by, pelt){
			if(!pelt) pelt = document;
			if(by){
				if(by === "id") return document.getElementById(key);
				else if(by === "class") return pelt.getElementsByClassName(key);
				else if(by === "tag") return pelt.getElementsByTagName(key);
			}else{
				var comp = key.match(/^([#\.])(.+)$/);
				if(!comp) return pelt.getElementsByTagName(key);
				else if(comp[1] === "#") return document.getElementById(comp[2]);
				else if(comp[1] === ".") return pelt.getElementsByClassName(comp[2]);
			}
		},
		select: function(selector, pelt){
			if(!pelt) pelt = document;
			return pelt.querySelector(selector);
		},
		
		set_class: function(obj, cname, add_remove){
			var cnamepat = new RegExp("\\b" + cname);
			if(add_remove === "add"){
				if(!obj.className) obj.className = cname;
				else if(!obj.className.match(cnamepat)) obj.className += " " + cname;
			}else if(add_remove === "remove"){
				obj.className = obj.className.replace(cnamepat, "");
			}
		}
	},
	
	
	
	
	get_first: function (obj){
		return (obj instanceof Array) ? obj[0] : obj;
	},
	obj: {
		get_oneuri: function (obje){
			if(!obje) return "";
			if(obje instanceof Array) obje = obje[0];
			return typeof(obje) === "string" ? obje : (obje[Miiif.a.id] ? obje[Miiif.a.id] : "");
		},
		merge: function (obje1, obje2) {
			for(var attr in obje2) {
				if(obje2.hasOwnProperty(attr)){
					if(obje1[attr] instanceof Array) Mut.arr.append(obje1, attr, obje2[attr]);
					else obje1[attr] = obje2[attr];
				}
			}
		},
		copy: function(sobj){
			if(typeof(sobj) !== "object") return sobj;
			var dobj;
			if(sobj instanceof Array){
				dobj = [];
				sobj.forEach(function(o){
					dobj.push(this.copy(o));
				}, this);
			}else{
				dobj = {};
				for(var p in sobj) dobj[p] = this.copy(sobj[p]);
			}
			return dobj;
		},
		prepare: function(obje, key){
			if(!obje[key]) obje[key] = {};
		},
		countup: function(obje, val){
			if(!obje[val]) obje[val] = 1;
			else obje[val]++;
		}
	},
	
	arr: {
		add: function(tarr, tidx, val){
			if(!tarr[tidx]) tarr[tidx] = [];
			tarr[tidx].push(val);
		},
		append: function(tarr, tidx, newarr){
			tarr[tidx] = tarr[tidx] ? tarr[tidx].concat(newarr) : newarr;
		},
		uniq_push: function(arr, val){
			if(arr.indexOf(val) === -1) arr.push(val);
		},
		uniq_add: function(tarr, tidx, val){
			if(!tarr[tidx]) tarr[tidx] = [];
			else if(tarr[tidx].indexOf(val) !== -1) return;
			tarr[tidx].push(val);
		},
		uniq_merge: function(arr1, arr2){
			return arr1.concat(arr2).filter(function (x, i, self) {
				return self.indexOf(x) === i;
			});
		},
		copy: function(from, to_reverse){
			return to_reverse ?
			OpenSeadragon.extend(true, [], from).reverse() :
			OpenSeadragon.extend(true, [], from);
		},
		circular: function(aobj, val, max, reserve){
			if(aobj.length >= max){
				if(reserve){
					var recent = aobj.slice(reserve + 2, max);
					if(aobj[reserve] === "**sliced"){
						aobj = aobj.slice(0, reserve + 1);
					}else{
						aobj = aobj.slice(0, reserve);
						aobj.push("**sliced");
					}
					aobj = aobj.concat(recent);
				}else{
					aobj = aobj.slice(1, max);
				}
			}
			aobj.push(val);
			return aobj;
		},
		of_nums: function(str, sep){
			if(!sep) sep = ",";
			if(typeof(str)==="string"){
				var res = [];
				str.split(sep).forEach(function(n){res.push(Number(n));});
				return res;
			}else{
				return str;
			}
		}
	},

	html: {
		safe_text: function (obj){
			if(!obj) return "";
			var res = Mut.str.lang_val(obj);
			return this.safe_str(res);
		},
		safe_str: function(str){
			return typeof(str) === "string" ? str.replace(/<script/g, "&lt;script").
			replace(/<(\w[^>]+)>/g, function(tag){
				var aa=[];
				tag.split(/\s+/).forEach(function(a){aa.push(a.replace(/^on/i, 'non'));});
				return aa.join(' ');
			}).
			replace(/  +/g, " ") : str;
		},
		attr_safe: function(str){
			return str.replace(/<.*?>/g, "").replace('"', "'"); //"
		},
		gen_anchor: function(link, text){
			if(!text) text = link;
			return "<a href=\"" + link.replace('&', '&amp;')+"\">" + text + "</a>";
		},
		str_or_link: function(text){
			return text ? (String(text).match(/^https?:[^ ]+$/) ? 
				this.gen_anchor(String(text), text) :
			this.fold_text(String(text))) : "";
		},
		get_text_link: function(obj, useformat){
			var link, text;
			if(typeof(obj) === "object"){
				link = obj.id || obj[Miiif.a.id];
				text = this.safe_text(obj.label);
				if(useformat && obj.format) text += " (" + obj.format + ")";
			}else{
				link = obj;
			}
			return text ? this.gen_anchor(link, text) : this.str_or_link(link);
		},
		fold_text: function (text, type){
			var limit = this.set_limit(text, type || "long"),
			thld = limit - 6,
			notag = text.replace(/<.*?>/g, "");
			if(notag.length > limit){
				return notag.substr(0, thld) + "<span class=\"more\">" +
				notag.substr(thld) + "</span><span class=\"expander\" " +
				"onclick=\"Muib.tool.expand(this);\">...(more)</span>";
			}else{
				return text;
			}
		},
		trim_text: function (text, type, to_half){
			var limit = this.set_limit(text, type || "long");
			if(to_half) limit = Math.round(limit / 2);
			var thld = limit - 3;
			if(text.length > limit){
				return text.substr(0, thld) + "...";
			}else{
				return text;
			}
		},
		set_limit: function(str, type){
			return [
				{"min": 13, "ss": 20, "short": 22, "semi": 40, "mid": 75, "slong": 140, "long": 260, "xlong": 500},
				{"min": 9, "ss": 12, "short": 14, "semi": 24, "mid": 60, "slong": 100, "long": 140, "xlong": 280}
			][String(str).match(/^✍?[\x20-\x7E\xC0-\xFC]{8}/) ? 0 : 1][type]; 
		},
		
		abbr: function(body, expanded, asTagString = false){
			return asTagString ? "<abbr title=\"" + expanded + "\">" + body +"</abbr> " : 
			Mut.dom.elt("abbr", body, [["title", expanded]]);
		}
		
	},
	
	str: {
		prop: {lang: "language", langedval: "value", val: "value"},
		preflang: null,
		set_prop: function(mode){
			this.prop = mode === "iiif" ?
			{lang: "@language", langedval: "@value", val: "value"} :
			{lang: "language", langedval: "value", val: "value"};
		},
		lang_val: function (obj){
			if(!obj){
				return "";
			}else if(obj instanceof Array){
				if(obj.length === 0) return "";
				obj = this.lang_obj(obj);
			}else if(Miiif.vers.v >= 3){
				obj = this.lang_obj([obj]);
			}
			if(typeof(obj)==="string"){// || typeof(obj)==="number"
				return obj;
			}else if(obj[this.prop.langedval] !== undefined){
				return obj[this.prop.langedval];
			}else if(obj[this.prop.val] !== undefined){
				return obj[this.prop.val];
			}else if(obj[this.prop.lang]){
				console.warn("no value, only", this.prop.lang, obj[this.prop.lang]);
				return "(no value w/ " + this.prop.lang + ": '" + obj[this.prop.lang] + "')";
			}else{
				console.warn("non string:", obj, " (type) ", typeof(obj));
				return String(obj);
			}
		},
		lang_obj: function(arrobj){
			var str=[],
			glue="; ",
			res={},
			ro = {},
			lang;
			res[this.preflang] = [];
			if(this.preflang !== "en") res.en = [];
			arrobj.forEach(function(o){
				if(o[this.prop.lang] && typeof(o[this.prop.langedval]) !== "undefined"){
					lang = o[this.prop.lang].substr(0,2);
					if(!res[lang]) res[lang] = [];
					res[lang].push(o[this.prop.langedval]);
				}else if(typeof(o) === "string"){
					str.push(o);
				}else if(o.value && typeof(o.value) === "string"){
					str.push(o.value);
				}else if(o[this.prop.langedval]){
					str.push(o[this.prop.langedval]);
				}else if(o instanceof Array){
					res[this.preflang].push(this.lang_val(o));
				}else if(Miiif.vers.v >= 3 && typeof(o) === "object"){
					for(var lp in o) res[lp] = o[lp];
				}else if(o[this.prop.langedval]){
					str.push(o[this.prop.langedval]);
				}
			}, this);
			if(res[this.preflang].length) {
				ro[this.prop.lang] = this.preflang;
				ro[this.prop.langedval] = res[this.preflang].join(glue);
			}else if(res.en.length){
				ro[this.prop.lang] = "en";
				ro[this.prop.langedval] = res.en.join(glue);
			}else if(res["@none"]){
				ro = res["@none"].join(glue);
			}else if(str.length){
				ro = str.join(glue);
			}else{
				ro = arrobj[0];
			}
			if(Muib && Muib.meta.lang.watch) set_lang_opts(this);
			return ro;
			
			function set_lang_opts(that){
				Object.keys(res).forEach(function(lng){
					if(res[lng].length && lng !== "@none"){
						Muib.meta.lang.opts[lng] = true;
						if(lng === that.preflang) Muib.meta.lang.selected = lng;
						else if(lng === ro[that.prop.lang] && Muib.meta.lang.selected !== that.preflang) Muib.meta.lang.selected = lng;
					}
				});
			}
		},
		
		easy_fingerprint: function(str, len){
			if(!str) return 0;
			if(!len) len = 96;
			if(typeof(str) !== "string") str = str.toString();
			var ts=str.substr(0, len), n=ts.length, i=0, fp=n;
			for(;i<n; i++) fp += ts.charCodeAt(i) * (i % 8 + 1);
			return fp.toString(16);
		},
		uc_first: function(str){
			return str.substr(0,1).toUpperCase() +str.substr(1)
		}
	},
	
	uri: {
		resolve_partial: function(partial){
			if(!partial.match(/^(https?|urn):/)) return Muib.state.uribase + partial;
			else return partial;
		},
		resolve: function(uri, base){
			if(typeof(URL)==="function"){
				var u = new URL(uri, base || Mia.opts.base);
				return u.href;
			}else{
				return this.resolve_partial(uri);
			}
		},
		disp: function(uri){
			var comp = uri.split('/');
			return comp.length > 4 ? comp.slice(0,3).join('/') + "/..." + comp.pop() : uri;
		},
		sfname: function(uri){
			return this.short_fname(uri)[1];
		},
		short_fname: function(uri){
			var fname = uri.replace(/^https?:\/{2}/, "");
			if(fname.length < 30) return ["", fname];
			else return [fname.substr(0, 10), fname.substr(-16, 16)];
		},
		filename: function(uri){
			return typeof(uri) === "string" ? uri.replace(/#[^#]+$/, "").split(/[\/\?]/).pop() : uri;
		},
		signat: function(uri, num){
			if(!num) num = 2;
			return typeof(uri) === "string" ? uri.replace(/\/$/, "").split('/').splice(-num).join('/') : uri;
		},
		set_action_info: function(pfx, uri){
			var sfname = this.short_fname(uri),
			what = Miiif.use ? "canvas" : "image";
			pfx += " ";
			return [pfx + sfname[1], pfx + what + " (" + sfname[0] + "..." + sfname[1] + ")"];
		}
	},
	scheme: {
		exists_another: function(obj, uri, as_uri){
			var val = obj[uri], uri2;
			if(val) return as_uri ? uri : val;
			else{
				if(!(uri2 = this.swap(uri))) return false;
				if(val = obj[uri2]){
					console.warn("different scheme in object key");
					return as_uri ? uri2 : val;
				}
			}
			return false;
		},
		arr_exists_another: function(arr, uri, as_uri){
			var pos;
			if((pos = arr.indexOf(uri)) >=0) return as_uri ? uri : pos;
			else{
				var uri2 = this.swap(uri);
				if(!uri2) return -1;
				if((pos = arr.indexOf(uri2)) >= 0){
					console.warn("different scheme in array element");
					return as_uri ? uri2 : pos;
				}
			}
			return as_uri ? null : -1;
		},
		swap: function(uri){
			if(uri.match(/^http:/)) return uri.replace(/^http/, "https");
			else if(uri.match(/^https:/)) return uri.replace(/^https/, "http");
			else return null;
		},
		trim: function(uri){
			return uri.replace(/^https?:\/{2}/, "");
		}
	},

	frag: {
		parse_obj: function(tg){
			if(typeof(tg)==="string"){
				return this.parse_uri(tg);
			}else{
				var tgid = tg.id || tg["@id"];
				if(tgid && tgid.match(/^http/)) return this.parse_uri(tgid);
				else return this.parse_selector(tg);
			}
		},
		parse_uri: function (uri){
			if(typeof(URL)==="function"){
				var u = new URL(uri, Mia.opts.base), res = [];
				if(u.hash){
					res = this.as_array(u.hash.substr(1), u.protocol+"//" + u.host + u.pathname + u.search);
				}else res = [u.href, "", "", ""];
				return res;
			}else{
				var m;
				if(uri && (m = uri.match(/^(.+)#([^#]+)$/))){
					return this.as_array(m[2], m[1]);
				}else{
					return [uri, "", "", ""];
				}
			}
		},
		parse_selector: function(tg){
			var base = tg.source || tg.full || tg.id || tg["@id"],
			sel = tg.selector,
			frag = sel ? (sel.value || (sel.default ? sel.default.value : null) || sel.region) : "";
			if(frag) return this.as_array(frag, base);
			else return [base, "", "", ""];
		},
		as_array: function(frag, base){
			var res = [];
			frag.split(/&/).forEach(function(h){
				if(h.substr(0,4)==="xywh") res[0] = h.substr(5);
				else if(h.substr(0,2)==="t=") res[1] = h.substr(2);
				else if(h.match(/^\d+,\d+,\d/)) res[0] = h;
				res[2] = frag;
			});
			if(base) res.unshift(base);
			return res;
		}
	},
	
	

	num: {
		asc: function(a, b){
			return a - b;
		},
		desc: function(a, b){
			return b - a;
		},
		nasc: function(a, b){
			return Number(a) - Number(b);
		},
		ndesc: function(a, b){
			return Number(b) - Number(a);
		}
	}
};

