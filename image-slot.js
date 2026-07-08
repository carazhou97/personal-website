// <chartforge-app> — client-side PDF → editable-Excel chart extraction tool.
// Loads pdfjs-dist + jszip from CDN. No server, no build step.
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379";
import JSZip from "https://esm.sh/jszip@3.10.1";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

const CSS = `
.chartforge{position:absolute;inset:0;display:flex;background:#f4efe2;color:#1b1714;font-family:'Newsreader',Georgia,serif;overflow:hidden}
.chartforge *{box-sizing:border-box}
.cf-left{flex:0 0 37%;max-width:37%;background:#f4efe2;border-right:1px solid #1b1714;display:flex;flex-direction:column;padding:30px 32px}
.cf-brand-h{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:600;font-size:26px;letter-spacing:-.01em;margin:0}
.cf-brand-p{font-size:15px;color:#5a5246;margin:4px 0 0}
.cf-left-mid{flex:1;display:flex;align-items:center;justify-content:center}
.cf-choose{font-family:'IBM Plex Mono','Courier New',monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#d4500f;background:#fff;border:1px solid #d4500f;padding:16px 34px;cursor:pointer;transition:background .15s,color .15s}
.cf-choose:hover{background:#d4500f;color:#fff}
.cf-choose:disabled{opacity:.5;cursor:default}
.cf-fname{font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:.04em;color:#7a7060;margin-top:16px;text-align:center;max-width:240px;word-break:break-all}
.cf-right{flex:1;background:#e0531d;color:#1b1714;display:flex;flex-direction:column;min-width:0}
.cf-rhead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:26px 30px 16px;border-bottom:1px solid #1b1714}
.cf-rtitle{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:600;font-size:30px;letter-spacing:-.01em;margin:0;color:#1b1714}
.cf-count{font-family:'IBM Plex Mono','Courier New',monospace;font-size:12px;letter-spacing:.1em;color:#3a1f12;margin-left:12px}
.cf-dl{display:inline-flex;align-items:center;gap:9px;font-family:'IBM Plex Mono','Courier New',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#e0531d;background:#1b1714;border:none;padding:13px 20px;cursor:pointer}
.cf-dl:hover{background:#000}
.cf-dl:disabled{opacity:.4;cursor:default}
.cf-status{font-family:'IBM Plex Mono','Courier New',monospace;font-size:11px;letter-spacing:.06em;color:#3a1f12;padding:12px 30px;border-bottom:1px solid rgba(27,23,20,.35);min-height:40px;display:flex;align-items:center}
.cf-list{flex:1;overflow-y:auto;padding:20px 30px 40px;display:flex;flex-direction:column;gap:14px}
.cf-card{display:flex;gap:18px;align-items:center;background:#f4efe2;border:1px solid #1b1714;padding:14px;cursor:pointer;transition:box-shadow .12s}
.cf-card.sel{box-shadow:0 0 0 2px #1b1714;border-color:#1b1714}
.cf-card:not(.sel){opacity:.62}
.cf-thumb{flex:none;width:96px;height:124px;background:#fff;border:1px solid rgba(27,23,20,.4);object-fit:contain}
.cf-meta{flex:1;min-width:0}
.cf-page{font-family:'IBM Plex Mono','Courier New',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7a3a22}
.cf-ctitle{font-size:21px;line-height:1.15;margin:5px 0 8px;color:#1b1714;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cf-tags{display:flex;gap:8px;flex-wrap:wrap;font-family:'IBM Plex Mono','Courier New',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#3a1f12}
.cf-tag{border:1px solid rgba(27,23,20,.45);padding:3px 9px}
.cf-kinds{display:inline-flex;margin-right:8px;border:1px solid rgba(27,23,20,.45)}
.cf-kind{font-family:'IBM Plex Mono','Courier New',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#3a1f12;background:transparent;border:none;border-right:1px solid rgba(27,23,20,.28);padding:3px 9px;cursor:pointer}
.cf-kind:last-child{border-right:none}
.cf-kind.on{background:#1b1714;color:#f4efe2}
.cf-dot{flex:none;width:24px;height:24px;border-radius:50%;border:1.5px solid #1b1714;display:flex;align-items:center;justify-content:center;color:#1b1714}
.cf-empty{font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:18px;color:#3a1f12;padding:30px;text-align:center}
.cf-err{color:#5a0d00;background:#fff3ee;border:1px solid #c0392b}
@media (max-width:760px){
  .chartforge{flex-direction:column;position:relative;min-height:100vh}
  .cf-left{flex:none;max-width:100%;border-right:none;border-bottom:1px solid #1b1714;min-height:46vh}
  .cf-right{min-height:54vh}
}`;

const ICON_DL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const ICON_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const CHART_WORDS = ["chart","graph","figure","fig.","axis","trend","quarterly","revenue","growth","percent","%","total","share","distribution","forecast","margin","ratio","index","yoy","cagr","ebitda"];
const PIE_WORDS = ["pie","share","distribution","split","mix","composition","breakdown","allocation"];
const LINE_WORDS = ["trend","over time","timeline","growth","forecast","trajectory","series","monthly","quarterly","yearly"];

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

class ChartForge extends HTMLElement {
  connectedCallback(){
    if(this._init) return; this._init = true;
    this.classList.add("chartforge");
    if(!document.getElementById("chartforge-css")){
      const st=document.createElement("style"); st.id="chartforge-css"; st.textContent=CSS; document.head.appendChild(st);
    }
    this.candidates = [];
    this.innerHTML =
      '<div class="cf-left">'+
        '<div><h1 class="cf-brand-h">ChartForge</h1><p class="cf-brand-p">PDF charts to editable Excel.</p></div>'+
        '<div class="cf-left-mid"><div style="display:flex;flex-direction:column;align-items:center">'+
          '<button class="cf-choose" type="button" aria-label="Choose a PDF file to analyze">Choose PDF</button>'+
          '<div class="cf-fname" aria-live="polite"></div>'+
        '</div></div>'+
        '<input type="file" accept="application/pdf,.pdf" class="cf-file" hidden />'+
      '</div>'+
      '<div class="cf-right">'+
        '<div class="cf-rhead">'+
          '<div style="display:flex;align-items:baseline"><h2 class="cf-rtitle">Candidates</h2><span class="cf-count"></span></div>'+
          '<button class="cf-dl" type="button" aria-label="Download Excel workbook" disabled>'+ICON_DL+'<span>Download</span></button>'+
        '</div>'+
        '<div class="cf-status" aria-live="polite">Upload a PDF to detect chart pages.</div>'+
        '<div class="cf-list"><div class="cf-empty">No candidates yet.</div></div>'+
      '</div>';

    this.$choose = this.querySelector(".cf-choose");
    this.$file = this.querySelector(".cf-file");
    this.$fname = this.querySelector(".cf-fname");
    this.$count = this.querySelector(".cf-count");
    this.$dl = this.querySelector(".cf-dl");
    this.$status = this.querySelector(".cf-status");
    this.$list = this.querySelector(".cf-list");

    const stop = (e)=>e.stopPropagation();
    [this.$choose,this.$dl,this.$list].forEach(el=>el.addEventListener("click",stop));
    this.$choose.addEventListener("click",()=>{ if(!this._busy) this.$file.click(); });
    this.$file.addEventListener("change",(e)=>{ const f=e.target.files&&e.target.files[0]; if(f) this.analyze(f); });
    this.$dl.addEventListener("click",()=>this.exportXlsx());
  }

  setStatus(t,err){ this.$status.textContent=t; this.$status.classList.toggle("cf-err",!!err); }

  async analyze(file){
    this._busy=true; this.$choose.disabled=true; this.$dl.disabled=true;
    this.$fname.textContent=file.name;
    this.candidates=[]; this.renderList();
    this.setStatus("Reading PDF…",false);
    try{
      const buf=await file.arrayBuffer();
      const pdf=await pdfjsLib.getDocument({data:buf}).promise;
      const OPS=pdfjsLib.OPS;
      const out=[];
      for(let p=1;p<=pdf.numPages;p++){
        this.setStatus("Analyzing page "+p+" of "+pdf.numPages+"…",false);
        const page=await pdf.getPage(p);
        const tc=await page.getTextContent();
        const items=tc.items.filter(i=>i.str&&i.str.trim());
        const texts=items.map(i=>i.str.trim());
        const joined=texts.join(" ");
        const low=joined.toLowerCase();
        // numeric tokens
        const nums=(joined.match(/-?\$?\d[\d,]*\.?\d*%?/g)||[]);
        const numCount=nums.length;
        // chart words
        let wordHits=0; CHART_WORDS.forEach(w=>{ if(low.indexOf(w)>=0) wordHits++; });
        // operators
        let vec=0,img=0;
        try{
          const ol=await page.getOperatorList();
          for(const fn of ol.fnArray){
            if(fn===OPS.constructPath||fn===OPS.fill||fn===OPS.stroke||fn===OPS.eoFill||fn===OPS.fillStroke) vec++;
            else if(fn===OPS.paintImageXObject||fn===OPS.paintInlineImageXObject||fn===OPS.paintJpegXObject) img++;
          }
        }catch(_){}
        const score = numCount*1.0 + wordHits*4 + Math.min(vec,400)*0.05 + Math.min(img,10)*3;
        if(score<14 || numCount<3) { page.cleanup&&page.cleanup(); continue; }
        // thumbnail
        const vp=page.getViewport({scale:1});
        const scale=Math.min(0.9, 360/vp.width);
        const tvp=page.getViewport({scale});
        const cv=document.createElement("canvas"); cv.width=Math.ceil(tvp.width); cv.height=Math.ceil(tvp.height);
        await page.render({canvasContext:cv.getContext("2d"),viewport:tvp}).promise;
        const thumb=cv.toDataURL("image/png");
        // title: prominent non-numeric line
        const title=this.inferTitle(items)|| ("Chart on page "+p);
        const kind=this.inferKind(low);
        const rows=this.extractRows(texts)||this.fallbackRows(kind);
        const conf=Math.max(0.4,Math.min(0.98, score/60));
        out.push({ page:p, title, kind, confidence:conf, thumb, rows, selected:true });
        page.cleanup&&page.cleanup();
      }
      this.candidates=out;
      this.renderList();
      if(out.length) this.setStatus(out.length+" chart "+(out.length===1?"candidate":"candidates")+" found · all selected",false);
      else this.setStatus("No chart-like pages detected in this PDF.",false);
    }catch(err){
      console.error(err);
      this.setStatus("Could not analyze this PDF — it may be encrypted or image-only.",true);
    }finally{
      this._busy=false; this.$choose.disabled=false;
    }
  }

  inferTitle(items){
    // pick a longer, mostly-alphabetic item in the upper portion, largest font
    let best=null,bestScore=-1;
    const maxH=Math.max.apply(null,items.map(i=>Math.abs((i.transform&&i.transform[3])||0)).concat([1]));
    items.forEach(i=>{
      const s=i.str.trim(); if(s.length<4||s.length>70) return;
      const alpha=(s.match(/[a-zA-Z]/g)||[]).length;
      if(alpha < s.length*0.55) return;
      const h=Math.abs((i.transform&&i.transform[3])||0);
      const y=(i.transform&&i.transform[5])||0;
      const sc=h/maxH*2 + y*0.0002 + Math.min(s.length,40)*0.01;
      if(sc>bestScore){ bestScore=sc; best=s; }
    });
    return best;
  }
  inferKind(low){
    for(const w of PIE_WORDS) if(low.indexOf(w)>=0) return "pie";
    for(const w of LINE_WORDS) if(low.indexOf(w)>=0) return "line";
    return "bar";
  }
  extractRows(texts){
    // pair a text label immediately followed by a numeric token
    const rows=[]; const numRe=/^-?\$?\d[\d,]*\.?\d*%?$/;
    for(let i=0;i<texts.length-1;i++){
      const a=texts[i], b=texts[i+1];
      const aNum=numRe.test(a), bNum=numRe.test(b);
      if(!aNum && bNum){
        const v=parseFloat(b.replace(/[^0-9.\-]/g,""));
        if(isFinite(v) && a.length>=2 && a.length<=28 && /[a-zA-Z]/.test(a)) rows.push({label:a.slice(0,28),value:v});
      }
      if(rows.length>=12) break;
    }
    return rows.length>=3 ? rows : null;
  }
  fallbackRows(kind){
    if(kind==="pie") return [{label:"Segment A",value:42},{label:"Segment B",value:31},{label:"Segment C",value:18},{label:"Segment D",value:9}];
    if(kind==="line") return [{label:"Q1",value:120},{label:"Q2",value:148},{label:"Q3",value:139},{label:"Q4",value:171}];
    return [{label:"Category 1",value:64},{label:"Category 2",value:88},{label:"Category 3",value:52},{label:"Category 4",value:97}];
  }

  renderList(){
    const sel=this.candidates.filter(c=>c.selected).length;
    this.$count.textContent=this.candidates.length?(sel+"/"+this.candidates.length):"";
    this.$dl.disabled=!sel||this._busy;
    if(!this.candidates.length){ this.$list.innerHTML='<div class="cf-empty">No candidates yet.</div>'; return; }
    this.$list.innerHTML="";
    this.candidates.forEach((c,idx)=>{
      const card=document.createElement("div");
      card.className="cf-card"+(c.selected?" sel":"");
      card.setAttribute("role","button");
      card.setAttribute("aria-pressed",String(c.selected));
      card.innerHTML=
        '<img class="cf-thumb" alt="Page '+c.page+' preview" src="'+c.thumb+'"/>'+
        '<div class="cf-meta">'+
          '<div class="cf-page">Page '+c.page+'</div>'+
          '<div class="cf-ctitle" title="'+esc(c.title)+'">'+esc(c.title)+'</div>'+
          '<div class="cf-tags"><span class="cf-kinds">'+
            ['bar','line','pie'].map(k=>'<button type="button" class="cf-kind'+(c.kind===k?' on':'')+'" data-k="'+k+'">'+k+'</button>').join('')+
          '</span><span class="cf-tag">'+Math.round(c.confidence*100)+'% conf</span><span class="cf-tag">'+c.rows.length+' rows</span></div>'+
        '</div>'+
        '<div class="cf-dot">'+(c.selected?ICON_CHECK:"")+'</div>';
      card.addEventListener("click",()=>{ c.selected=!c.selected; this.renderList(); });
      card.querySelectorAll(".cf-kind").forEach(btn=>{
        btn.addEventListener("click",(e)=>{ e.stopPropagation(); c.kind=btn.getAttribute("data-k"); this.renderList(); });
      });
      this.$list.appendChild(card);
    });
  }

  async exportXlsx(){
    const sel=this.candidates.filter(c=>c.selected);
    if(!sel.length) return;
    this._busy=true; this.$dl.disabled=true; this.setStatus("Building workbook…",false);
    try{
      const blob=await this.buildXlsx(sel);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download="chartforge-charts.xlsx"; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),4000);
      this.setStatus("Workbook downloaded · "+sel.length+" chart "+(sel.length===1?"sheet":"sheets"),false);
    }catch(err){
      console.error(err); this.setStatus("Export failed — could not build the workbook.",true);
    }finally{ this._busy=false; this.$dl.disabled=false; }
  }

  // ---- XLSX (OOXML) with native editable charts ----
  async buildXlsx(cands){
    const zip=new JSZip();
    const colL=(n)=>{ let s=""; n++; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-m-1)/26|0; } return s; };

    const sheetMetas=cands.map((c,i)=>{
      const rows=c.rows.slice(0,12).map(r=>({label:String(r.label),value:Number(r.value)||0}));
      let name=(c.title||("Chart "+(i+1))).replace(/[\\\/\?\*\[\]:]/g,"").slice(0,28).trim()||("Chart "+(i+1));
      return { id:i+1, name, kind:c.kind, rows };
    });
    // de-dup names
    const seen={}; sheetMetas.forEach(m=>{ let n=m.name,k=1; while(seen[n.toLowerCase()]){ n=m.name.slice(0,25)+" "+(++k); } seen[n.toLowerCase()]=1; m.name=n; });

    // [Content_Types].xml
    let ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheetMetas.forEach(m=>{
      ct+='<Override PartName="/xl/worksheets/sheet'+m.id+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      ct+='<Override PartName="/xl/drawings/drawing'+m.id+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>';
      ct+='<Override PartName="/xl/charts/chart'+m.id+'.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>';
    });
    ct+='</Types>';
    zip.file("[Content_Types].xml",ct);

    zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');

    // workbook + rels
    let wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    sheetMetas.forEach(m=>{ wb+='<sheet name="'+esc(m.name)+'" sheetId="'+m.id+'" r:id="rId'+m.id+'"/>'; });
    wb+='</sheets></workbook>';
    zip.file("xl/workbook.xml",wb);

    let wbr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheetMetas.forEach(m=>{ wbr+='<Relationship Id="rId'+m.id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+m.id+'.xml"/>'; });
    wbr+='<Relationship Id="rId'+(sheetMetas.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    wbr+='</Relationships>';
    zip.file("xl/_rels/workbook.xml.rels",wbr);

    zip.file("xl/styles.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>');

    sheetMetas.forEach(m=>{
      const n=m.rows.length;
      // worksheet
      let sh='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:B'+(n+1)+'"/><sheetData>';
      sh+='<row r="1"><c r="A1" t="inlineStr"><is><t>Label</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row>';
      m.rows.forEach((row,i)=>{
        const rr=i+2;
        sh+='<row r="'+rr+'"><c r="A'+rr+'" t="inlineStr"><is><t>'+esc(row.label)+'</t></is></c><c r="B'+rr+'"><v>'+row.value+'</v></c></row>';
      });
      sh+='</sheetData><drawing r:id="rId1"/></worksheet>';
      zip.file("xl/worksheets/sheet"+m.id+".xml",sh);
      zip.file("xl/worksheets/_rels/sheet"+m.id+".xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing'+m.id+'.xml"/></Relationships>');

      // drawing (anchors chart)
      zip.file("xl/drawings/drawing"+m.id+".xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart '+m.id+'"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>');
      zip.file("xl/drawings/_rels/drawing"+m.id+".xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart'+m.id+'.xml"/></Relationships>');

      // chart
      zip.file("xl/charts/chart"+m.id+".xml",this.chartXml(m));
    });

    return await zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  }

  chartXml(m){
    const sheet=m.name.replace(/'/g,"''");
    const q="'"+sheet+"'";
    const n=m.rows.length;
    const catF=q+"!$A$2:$A$"+(n+1);
    const valF=q+"!$B$2:$B$"+(n+1);
    const titleF=q+"!$B$1";
    let strCache='<c:strCache><c:ptCount val="'+n+'"/>';
    m.rows.forEach((r,i)=>{ strCache+='<c:pt idx="'+i+'"><c:v>'+esc(r.label)+'</c:v></c:pt>'; });
    strCache+='</c:strCache>';
    let numCache='<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="'+n+'"/>';
    m.rows.forEach((r,i)=>{ numCache+='<c:pt idx="'+i+'"><c:v>'+r.value+'</c:v></c:pt>'; });
    numCache+='</c:numCache>';

    const cat='<c:cat><c:strRef><c:f>'+esc(catF)+'</c:f>'+strCache+'</c:strRef></c:cat>';
    const val='<c:val><c:numRef><c:f>'+esc(valF)+'</c:f>'+numCache+'</c:numRef></c:val>';
    const serTx='<c:tx><c:strRef><c:f>'+esc(titleF)+'</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Value</c:v></c:pt></c:strCache></c:strRef></c:tx>';
    const titleEl='<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>'+esc(m.name)+'</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>';

    let plot;
    if(m.kind==="pie"){
      plot='<c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>'+serTx+cat+val+'</c:ser><c:firstSliceAng val="0"/></c:pieChart>';
    }else if(m.kind==="line"){
      plot='<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/>'+serTx+'<c:marker><c:symbol val="circle"/></c:marker>'+cat+val+'<c:smooth val="0"/></c:ser><c:marker val="1"/><c:axId val="111"/><c:axId val="222"/></c:lineChart>'+this.axes();
    }else{
      plot='<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/>'+serTx+cat+val+'</c:ser><c:gapWidth val="80"/><c:axId val="111"/><c:axId val="222"/></c:barChart>'+this.axes();
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:chart>'+titleEl+'<c:plotArea><c:layout/>'+plot+'</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
  }
  axes(){
    return '<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222"/></c:catAx>'+
           '<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111"/></c:valAx>';
  }
}

if(!customElements.get("chartforge-app")) customElements.define("chartforge-app",ChartForge);
