package com.buttercode.mobile;
import androidx.test.ext.junit.runners.AndroidJUnit4;import androidx.test.platform.app.InstrumentationRegistry;import androidx.test.core.app.ActivityScenario;import android.content.*;import android.graphics.Bitmap;import java.io.*;import java.util.concurrent.*;import java.util.concurrent.atomic.*;import org.junit.Test;import org.junit.runner.RunWith;import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class) public class LaunchTest {
 private void nativeText(String text,boolean tap)throws Exception{for(int n=0;n<50;n++){android.view.accessibility.AccessibilityNodeInfo root=InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();if(root!=null){java.util.List<android.view.accessibility.AccessibilityNodeInfo> found=root.findAccessibilityNodeInfosByText(text);for(android.view.accessibility.AccessibilityNodeInfo node:found){if(node.getText()==null||!text.equalsIgnoreCase(node.getText().toString()))continue;if(!tap)return;while(node!=null&&!node.isClickable())node=node.getParent();if(node!=null&&node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK))return;}}Thread.sleep(100);}fail("Native control unavailable: "+text);}
 private ActivityScenario<MainActivity> launch(){Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();Intent intent=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());assertNotNull(intent);return ActivityScenario.launch(intent);}
 private String js(ActivityScenario<MainActivity> scenario,String expression)throws Exception{CountDownLatch ready=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();scenario.onActivity(a->a.web.evaluateJavascript(expression,v->{value.set(v);ready.countDown();}));assertTrue("WebView evaluation timed out",ready.await(10,TimeUnit.SECONDS));return value.get();}
 private void ready(ActivityScenario<MainActivity> scenario)throws Exception{for(int n=0;n<80;n++){String v=js(scenario,"document.readyState==='complete'&&!!document.querySelector('#app h1,#root h1')&&document.body.innerText.length>120&&!document.body.innerText.includes('Opening your workspace')");if("true".equals(v))return;Thread.sleep(250);}fail("The packaged app did not render usable content.");}
 @androidx.test.filters.SdkSuppress(minSdkVersion=29) @Test public void assetsAndNativeBridgeLoadOffline()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();try(InputStream in=context.getAssets().open("web/index.html")){assertTrue(in.read()!=-1);}
  try(ActivityScenario<MainActivity> scenario=launch()){
   ready(scenario);assertEquals("true",js(scenario,"typeof window.AppHost!=='undefined'&&typeof window.AndroidFiles?.exportUrl==='function'"));
   scenario.onActivity(a->{a.web.getSettings().setBlockNetworkLoads(true);a.web.loadUrl(BuildConfig.APP_ORIGIN+"/?offlineSmoke=1");});for(int n=0;n<80;n++){if("true".equals(js(scenario,"location.search.includes('offlineSmoke=1')&&document.readyState==='complete'&&!!document.querySelector('#app h1,#root h1')")))break;Thread.sleep(250);}ready(scenario);
   saveScreenshot(scenario,context,"offline");
   assertEquals("false",js(scenario,"document.body.innerText.includes('We couldn’t open your workspace')||document.body.innerText.includes('We couldn’t open your local library')"));
   assertEquals("false",js(scenario,"document.documentElement.scrollWidth>innerWidth+2"));

  }
 }
 private void saveScreenshot(ActivityScenario<MainActivity> scenario,Context context,String label)throws Exception{
  CountDownLatch painted=new CountDownLatch(1);scenario.onActivity(a->a.web.postVisualStateCallback(System.nanoTime(),new android.webkit.WebView.VisualStateCallback(){@Override public void onComplete(long id){painted.countDown();}}));assertTrue("WebView did not commit its rendered frame",painted.await(10,TimeUnit.SECONDS));
  InstrumentationRegistry.getInstrumentation().waitForIdleSync();Thread.sleep(600);
  Bitmap image=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull("No emulator screenshot",image);
  android.content.ContentValues values=new android.content.ContentValues();values.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,BuildConfig.APPLICATION_ID+"-"+label+".png");values.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");String mode=context.getResources().getConfiguration().orientation==android.content.res.Configuration.ORIENTATION_LANDSCAPE?"landscape":context.getResources().getConfiguration().smallestScreenWidthDp>=600?"tablet":"phone";values.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures/AndroidAcceptance/"+mode);android.net.Uri uri=context.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);try(OutputStream out=context.getContentResolver().openOutputStream(uri)){assertNotNull(out);assertTrue(image.compress(Bitmap.CompressFormat.PNG,100,out));}image.recycle();
 }
 @androidx.test.filters.SdkSuppress(minSdkVersion=29) @Test public void integratedChromeTracksThemeAndDoesNotStealContentSpace()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  try(ActivityScenario<MainActivity> scenario=launch()){
   ready(scenario);
   for(int n=0;n<60&&!"1".equals(js(scenario,"document.querySelectorAll('[data-android-menu]').length"));n++)Thread.sleep(100);
   assertEquals("1",js(scenario,"document.querySelectorAll('[data-android-menu]').length"));
   scenario.onActivity(a->{android.view.ViewGroup parent=(android.view.ViewGroup)a.web.getParent();assertSame("No native toolbar may sit below the product",a.web,parent.getChildAt(parent.getChildCount()-1));});
   if(BuildConfig.SCREEN_CAPTURE){
    assertEquals("2",js(scenario,"document.querySelectorAll('[data-android-capture] button').length"));
    assertEquals("true",js(scenario,"Array.from(document.querySelectorAll('[data-android-capture] button')).every(b=>b.getBoundingClientRect().height>=48&&!b.disabled)"));
    assertEquals("false",js(scenario,"document.body.innerText.includes('Use Record screen below')"));
   }
   boolean themes="true".equals(js(scenario,"!!document.querySelector('[data-action=theme],#themeBtn')"));
   for(String theme:themes?new String[]{"light","dark"}:new String[]{"light"}){
    js(scenario,"document.documentElement.dataset.theme='"+theme+"'");
    AtomicBoolean matched=new AtomicBoolean(false);
    for(int n=0;n<60;n++){
     scenario.onActivity(a->{boolean light=androidx.core.view.WindowCompat.getInsetsController(a.getWindow(),a.getWindow().getDecorView()).isAppearanceLightStatusBars();matched.set(light==!theme.equals("dark"));});
     if(matched.get())break;Thread.sleep(100);
    }
    assertTrue("System-bar icons did not follow "+theme,matched.get());Thread.sleep(250);
    assertEquals("false",js(scenario,"document.documentElement.scrollWidth>innerWidth+2"));
    assertEquals("true",js(scenario,"(()=>{const r=document.querySelector('[data-android-menu]').getBoundingClientRect();return r.width>=40&&r.height>=40&&r.right<=innerWidth+1})()"));
    saveScreenshot(scenario,context,theme);
   }
   // Re-rendering an app screen must not duplicate the native controls.
   js(scenario,"window.requestAndroidHome&&window.requestAndroidHome()");Thread.sleep(400);
   assertEquals("1",js(scenario,"document.querySelectorAll('[data-android-menu]').length"));
   scenario.onActivity(a->a.web.getSettings().setTextZoom(140));Thread.sleep(400);
   assertEquals("false",js(scenario,"document.documentElement.scrollWidth>innerWidth+2"));
   saveScreenshot(scenario,context,"large-text");scenario.onActivity(a->a.web.getSettings().setTextZoom(100));
   js(scenario,"document.querySelector('[data-android-menu]').click()");Thread.sleep(300);
   android.view.accessibility.AccessibilityNodeInfo screen=InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();assertNotNull(screen);assertFalse("App menu did not open",screen.findAccessibilityNodeInfosByText("App controls").isEmpty());
   saveScreenshot(scenario,context,"app-menu");
   nativeText("Refresh page",true);nativeText("Refresh this page?",false);nativeText("Keep editing",true);
   ready(scenario);
   if(BuildConfig.SCREEN_CAPTURE){
    js(scenario,"document.querySelector('[data-android-action=recordScreen]').click()");nativeText("Record your screen",false);nativeText("Cancel",true);
    assertEquals("true",js(scenario,"!!document.querySelector('[data-android-capture]')"));
   }
  }
 }

 @Test public void nativeExportRequiresExactSequentialBytes()throws Exception{Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();ExportStore store=new ExportStore(context.getCacheDir());String token=store.begin("invoice.pdf","application/pdf",4);try{store.chunk(token,1,"JVBERg==");fail("Out-of-order export accepted");}catch(IOException expected){}store.chunk(token,0,"JVBERg==");File file=store.finish(token);assertEquals(4,file.length());try(InputStream in=new FileInputStream(file)){assertEquals('%',in.read());}assertTrue(file.delete());store.abort();}
 @Test public void rotatingKeepsTheLivePageAndUnsubmittedInput()throws Exception{
  try(ActivityScenario<MainActivity> scenario=launch()){
   ready(scenario);
   AtomicReference<android.webkit.WebView> original=new AtomicReference<>();
   scenario.onActivity(a->original.set(a.web));
   js(scenario,"(()=>{const field=document.createElement('input');field.id='rotation-draft';field.value='Unsubmitted draft';document.body.append(field);window.rotationDraft=true;return true})()");
   AtomicInteger target=new AtomicInteger();
   scenario.onActivity(a->{boolean portrait=a.getResources().getConfiguration().orientation==android.content.res.Configuration.ORIENTATION_PORTRAIT;target.set(portrait?android.content.res.Configuration.ORIENTATION_LANDSCAPE:android.content.res.Configuration.ORIENTATION_PORTRAIT);a.setRequestedOrientation(portrait?android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE:android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);});
   AtomicBoolean changed=new AtomicBoolean();
   for(int n=0;n<60;n++){scenario.onActivity(a->changed.set(a.getResources().getConfiguration().orientation==target.get()));if(changed.get())break;Thread.sleep(100);}
   assertTrue("The emulator did not rotate",changed.get());
   scenario.onActivity(a->assertSame("Rotation must not replace the editing WebView",original.get(),a.web));
   assertEquals("true",js(scenario,"window.rotationDraft===true&&document.querySelector('#rotation-draft')?.value==='Unsubmitted draft'"));
   js(scenario,"document.querySelector('#rotation-draft').remove()");
   scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
  }
 }

}
