package com.buttercode.mobile;
import androidx.test.ext.junit.runners.AndroidJUnit4;import androidx.test.platform.app.InstrumentationRegistry;import org.junit.Test;import org.junit.runner.RunWith;import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class) public class LaunchTest {
 @Test public void assetsArePackaged() throws Exception {try(java.io.InputStream in=InstrumentationRegistry.getInstrumentation().getTargetContext().getAssets().open("web/index.html")){assertTrue(in.read()!=-1);}}
}
