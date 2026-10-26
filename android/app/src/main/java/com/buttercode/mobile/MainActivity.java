package com.buttercode.mobile;

import android.app.*;import android.os.*;import android.content.*;import android.content.pm.PackageManager;import android.graphics.Color;import android.net.Uri;import android.view.*;import android.webkit.*;import android.widget.*;import android.provider.MediaStore;
import androidx.core.content.FileProvider;import androidx.webkit.*;
import org.json.*;import java.io.*;import java.util.*;import java.util.concurrent.*;

public class MainActivity extends androidx.activity.ComponentActivity {
 protected WebView web;private LinearLayout root;private ProgressBar progress;private TextView failure;
 private ExportStore exports;private final ExecutorService files=Executors.newSingleThreadExecutor();
 private ValueCallback<Uri[]> chooser;private Uri cameraUri;private File saveFile;private String saveMime;
 private static final int PICK=10,CAMERA=11,SAVE=12,MIC=13,PROJECTION=14;
 private boolean microphone;private final String origin=BuildConfig.APP_ORIGIN;
 @Override public void onCreate(Bundle state){super.onCreate(state);exports=new ExportStore(getCacheDir());
  root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(247,246,242));
  root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  setContentView(root);getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setIndeterminate(true);root.addView(progress,new LinearLayout.LayoutParams(-1,4));
  failure=new TextView(this);failure.setPadding(20,16,20,16);failure.setTextColor(Color.rgb(140,35,20));failure.setVisibility(View.GONE);root.addView(failure);
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setUserAgentString(settings.getUserAgentString()+" ButtercodeAndroid/1 "+BuildConfig.APPLICATION_ID);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){failure.setText("Update Android System WebView in Google Play, then reopen this app.");failure.setVisibility(View.VISIBLE);return;}
  WebViewCompat.addWebMessageListener(web,"AppHost",Set.of(origin),(view,message,source,isMainFrame,reply)->{
   if(!isMainFrame||!OriginPolicy.trusted(source.toString(),origin)||!OriginPolicy.trusted(web.getUrl(),origin))return;
   String raw=message.getData();if(raw==null||raw.length()>100000)return;
   files.execute(()->{String id="";try{JSONObject body=new JSONObject(raw);id=body.getString("id");if(id.length()>80)throw new IOException("Invalid request.");String op=body.getString("op");Object data;
    switch(op){case "exportBegin":data=new JSONObject().put("token",exports.begin(body.optString("name"),body.optString("mime"),body.optLong("size")));break;
     case "exportChunk":exports.chunk(body.getString("token"),body.getInt("sequence"),body.getString("bytes"));data=true;break;
     case "exportFinish":File completed=exports.finish(body.getString("token"));String mime=exports.mime,name=exports.name;runOnUiThread(()->offerExport(completed,name,mime));data=true;break;
     case "exportAbort":exports.abort();data=true;break;
     case "print":runOnUiThread(()->{android.print.PrintManager pm=(android.print.PrintManager)getSystemService(PRINT_SERVICE);pm.print(getString(com.buttercode.mobile.R.string.app_name),web.createPrintDocumentAdapter(getString(com.buttercode.mobile.R.string.app_name)),null);});data=true;break;
     default:throw new IOException("Unsupported native operation.");}
    post(reply,new JSONObject().put("id",id).put("ok",true).put("data",data));
   }catch(Exception e){try{post(reply,new JSONObject().put("id",id).put("ok",false).put("error",e instanceof IOException?e.getMessage():"The file transfer could not complete."));}catch(JSONException ignored){}}});
  });
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return localResponse(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(OriginPolicy.trusted(uri.toString(),origin))return false;if(!request.isForMainFrame())return true;external(uri);return true;}
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){progress.setVisibility(View.VISIBLE);failure.setVisibility(View.GONE);}
   @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);}
   @Override public void onReceivedSslError(WebView view,android.webkit.SslErrorHandler handler,android.net.http.SslError error){handler.cancel();showFailure("The secure connection could not be verified. Check your connection and retry.");}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showFailure("This page could not open. Your saved local data is kept. Check your connection, then tap Refresh.");}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(!OriginPolicy.trusted(web.getUrl(),origin))return false;if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
    boolean images=Arrays.stream(params.getAcceptTypes()).anyMatch(v->v.contains("image")||v.contains("pdf"));
    if(images)new AlertDialog.Builder(MainActivity.this).setTitle("Add a document").setItems(new String[]{"Choose a file or photo","Take a photo"},(d,n)->{if(n==1)takePhoto();else pickFile(params);}).setOnCancelListener(d->finishChooser(null)).show();else pickFile(params);return true;}
   @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->request.deny());}
   @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
   @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Continue",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
  });
  web.setDownloadListener((url,userAgent,disposition,mime,length)->{if(url.startsWith("blob:")||url.startsWith("data:")){web.evaluateJavascript("window.AndroidFiles&&AndroidFiles.exportUrl("+JSONObject.quote(url)+","+JSONObject.quote(URLUtil.guessFileName(url,disposition,mime))+","+JSONObject.quote(mime==null?"application/octet-stream":mime)+")",null);}else external(Uri.parse(url));});
  LinearLayout toolbar=new LinearLayout(this);toolbar.setGravity(Gravity.CENTER);addButton(toolbar,"Home",()->web.loadUrl(origin+"/"));addButton(toolbar,"Refresh",()->web.reload());if(BuildConfig.SCREEN_CAPTURE){addButton(toolbar,"Record screen",this::chooseRecording);addButton(toolbar,"Recordings",this::recordings);}root.addView(toolbar);
  getOnBackPressedDispatcher().addCallback(this,new androidx.activity.OnBackPressedCallback(true){@Override public void handleOnBackPressed(){web.evaluateJavascript("typeof window.handleAndroidBack==='function'&&!!window.handleAndroidBack()",handled->{if("true".equals(handled))return;if(web.canGoBack())web.goBack();else{setEnabled(false);getOnBackPressedDispatcher().onBackPressed();setEnabled(true);}});}});
  if(state==null){String path="/";Uri deep=getIntent().getData();if(deep!=null&&OriginPolicy.trusted(deep.toString(),origin))path=deep.getEncodedPath()+(deep.getEncodedQuery()==null?"":"?"+deep.getEncodedQuery())+(deep.getEncodedFragment()==null?"":"#"+deep.getEncodedFragment());web.loadUrl(origin+path);}else web.restoreState(state);
 }
 private void post(JavaScriptReplyProxy reply,JSONObject data){runOnUiThread(()->{if(!isFinishing()&&web!=null&&OriginPolicy.trusted(web.getUrl(),origin))reply.postMessage(data.toString());});}
 private void addButton(LinearLayout bar,String label,Runnable action){Button button=new Button(this);button.setText(label);button.setTextSize(12);button.setMinHeight(48);button.setOnClickListener(v->action.run());bar.addView(button,new LinearLayout.LayoutParams(0,-2,1));}
 private void showFailure(String message){failure.setText(message);failure.setVisibility(View.VISIBLE);progress.setVisibility(View.GONE);}
 private void external(Uri uri){String scheme=uri.getScheme();if(!Set.of("https","mailto","tel").contains(scheme==null?"":scheme))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException e){showFailure("No app can open this link.");}}
 private WebResourceResponse localResponse(Uri uri){
  if(!OriginPolicy.trusted(uri.toString(),origin))return null;String path=uri.getPath();
  if(BuildConfig.SCREEN_CAPTURE&&path!=null&&path.startsWith("/__native_recordings/")){String id=path.substring("/__native_recordings/".length());if(!OriginPolicy.recordingId(id))return empty(404);File file=new File(getFilesDir(),"recordings/"+id+".mp4");try{return new WebResourceResponse("video/mp4",null,200,"OK",Map.of("Cache-Control","no-store","Access-Control-Allow-Origin",origin),new FileInputStream(file));}catch(IOException e){return empty(404);}}
  String asset=OriginPolicy.assetPath(path);if(asset==null)return empty(403);if(BuildConfig.SCREEN_CAPTURE&&asset.startsWith("v/"))asset="index.html";
  try{InputStream stream=getAssets().open("web/"+asset);String extension=android.webkit.MimeTypeMap.getFileExtensionFromUrl(asset);String mime=android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);if(asset.endsWith(".js"))mime="text/javascript";if(mime==null)mime="application/octet-stream";return new WebResourceResponse(mime,"UTF-8",200,"OK",Map.of("Cache-Control","no-store","X-Content-Type-Options","nosniff"),stream);}catch(IOException e){if(asset.startsWith("api/")||!BuildConfig.BUNDLED_OFFLINE)return null;return empty(404);}
 }
 private WebResourceResponse empty(int status){return new WebResourceResponse("text/plain","UTF-8",status,status==403?"Forbidden":"Not Found",Map.of(),new ByteArrayInputStream(new byte[0]));}
 private void pickFile(WebChromeClient.FileChooserParams params){try{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");String[] types=Arrays.stream(params.getAcceptTypes()).filter(s->!s.isBlank()).toArray(String[]::new);if(types.length>0)intent.putExtra(Intent.EXTRA_MIME_TYPES,types);intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);startActivityForResult(intent,PICK);}catch(ActivityNotFoundException e){finishChooser(null);showFailure("No document picker is available.");}}
 private void takePhoto(){try{File directory=new File(getCacheDir(),"camera");directory.mkdirs();File photo=File.createTempFile("document-",".jpg",directory);cameraUri=FileProvider.getUriForFile(this,BuildConfig.APPLICATION_ID+".files",photo);Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT,cameraUri).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(intent,CAMERA);}catch(Exception e){finishChooser(null);showFailure("The camera could not open. Choose an existing photo instead.");}}
 private void finishChooser(Uri[] values){if(chooser!=null){chooser.onReceiveValue(values);chooser=null;}cameraUri=null;}
 private void offerExport(File file,String name,String mime){if(isFinishing())return;new AlertDialog.Builder(this).setTitle("Your file is ready").setItems(new String[]{"Save "+name,"Share file"},(d,n)->{if(n==1){Uri uri=FileProvider.getUriForFile(this,BuildConfig.APPLICATION_ID+".files",file);Intent share=new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);try{startActivity(Intent.createChooser(share,"Share file"));}catch(ActivityNotFoundException e){showFailure("No sharing app is available.");}}else{saveFile=file;saveMime=mime;try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime.split(";")[0]).putExtra(Intent.EXTRA_TITLE,name),SAVE);}catch(ActivityNotFoundException e){showFailure("No file saver is available.");}}}).show();}
 protected void chooseRecording(){showFailure("Native recording is not included in this build.");}
 protected void recordings(){showFailure("Native recordings are not included in this build.");}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==PICK){if(result!=RESULT_OK||data==null){finishChooser(null);return;}ArrayList<Uri> uris=new ArrayList<>();if(data.getClipData()!=null)for(int n=0;n<data.getClipData().getItemCount();n++)uris.add(data.getClipData().getItemAt(n).getUri());else if(data.getData()!=null)uris.add(data.getData());finishChooser(uris.toArray(new Uri[0]));}else if(request==CAMERA)finishChooser(result==RESULT_OK&&cameraUri!=null?new Uri[]{cameraUri}:null);else if(request==SAVE&&result==RESULT_OK&&data!=null&&data.getData()!=null&&saveFile!=null){File source=saveFile;Uri destination=data.getData();files.execute(()->{try(InputStream in=new FileInputStream(source);OutputStream out=getContentResolver().openOutputStream(destination,"w")){if(out==null)throw new IOException();byte[] buffer=new byte[32768];for(int n;(n=in.read(buffer))!=-1;)out.write(buffer,0,n);runOnUiThread(()->Toast.makeText(this,"File saved",Toast.LENGTH_SHORT).show());}catch(IOException e){runOnUiThread(()->showFailure("The file could not be saved. Your app data is unchanged."));}});} }
 @Override protected void onSaveInstanceState(Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);exports.abort();files.shutdown();if(web!=null){web.stopLoading();web.destroy();web=null;}super.onDestroy();}
}
