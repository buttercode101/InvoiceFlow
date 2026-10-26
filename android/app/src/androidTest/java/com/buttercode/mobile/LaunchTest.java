package com.buttercode.mobile;
import androidx.test.ext.junit.runners.AndroidJUnit4;import androidx.test.platform.app.InstrumentationRegistry;import androidx.test.core.app.ActivityScenario;import android.content.*;import android.graphics.Bitmap;import java.io.*;import java.util.concurrent.*;import java.util.concurrent.atomic.*;import org.junit.Test;import org.junit.runner.RunWith;import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class) public class LaunchTest {
 private ActivityScenario<MainActivity> launch(){Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();Intent intent=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());assertNotNull(intent);return ActivityScenario.launch(intent);}
 private String js(ActivityScenario<MainActivity> scenario,String expression)throws Exception{CountDownLatch ready=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();scenario.onActivity(a->a.web.evaluateJavascript(expression,v->{value.set(v);ready.countDown();}));assertTrue("WebView evaluation timed out",ready.await(10,TimeUnit.SECONDS));return value.get();}
 private void ready(ActivityScenario<MainActivity> scenario)throws Exception{for(int n=0;n<80;n++){String v=js(scenario,"document.readyState==='complete'&&!!document.querySelector('#app h1,#root h1')&&document.body.innerText.length>120");if("true".equals(v))return;Thread.sleep(250);}fail("The packaged app did not render usable content.");}
 @androidx.test.filters.SdkSuppress(minSdkVersion=29) @Test public void assetsAndNativeBridgeLoadOffline()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();try(InputStream in=context.getAssets().open("web/index.html")){assertTrue(in.read()!=-1);}
  try(ActivityScenario<MainActivity> scenario=launch()){
   ready(scenario);assertEquals("true",js(scenario,"typeof window.AppHost!=='undefined'&&typeof window.AndroidFiles?.exportUrl==='function'"));
   scenario.onActivity(a->{a.web.getSettings().setBlockNetworkLoads(true);a.web.loadUrl(BuildConfig.APP_ORIGIN+"/?offlineSmoke=1");});for(int n=0;n<80;n++){if("true".equals(js(scenario,"location.search.includes('offlineSmoke=1')&&document.readyState==='complete'&&!!document.querySelector('#app h1,#root h1')")))break;Thread.sleep(250);}ready(scenario);
   saveScreenshot(context);
   assertEquals("false",js(scenario,"document.body.innerText.includes('We couldn’t open your workspace')||document.body.innerText.includes('We couldn’t open your local library')"));
   assertEquals("false",js(scenario,"document.documentElement.scrollWidth>innerWidth+2"));

  }
 }
 private void saveScreenshot(Context context)throws Exception{
  Bitmap image=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull("No emulator screenshot",image);
  android.content.ContentValues values=new android.content.ContentValues();values.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,BuildConfig.APPLICATION_ID+"-offline.png");values.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");String mode=context.getResources().getConfiguration().smallestScreenWidthDp>=600?"tablet":"phone";values.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures/AndroidAcceptance/"+mode);android.net.Uri uri=context.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);try(OutputStream out=context.getContentResolver().openOutputStream(uri)){assertNotNull(out);assertTrue(image.compress(Bitmap.CompressFormat.PNG,100,out));}image.recycle();
 }
 @Test public void nativeExportRequiresExactSequentialBytes()throws Exception{Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();ExportStore store=new ExportStore(context.getCacheDir());String token=store.begin("invoice.pdf","application/pdf",4);try{store.chunk(token,1,"JVBERg==");fail("Out-of-order export accepted");}catch(IOException expected){}store.chunk(token,0,"JVBERg==");File file=store.finish(token);assertEquals(4,file.length());try(InputStream in=new FileInputStream(file)){assertEquals('%',in.read());}assertTrue(file.delete());store.abort();}
}
