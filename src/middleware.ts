import { NextRequest, NextResponse } from "next/server";

/**
 * 文件说明：根据访问设备在 PC 默认路由与移动端 /m 路由之间跳转。
 * 作者：Codex
 * 用途：项目使用 src/app 结构，本文件放在 src 下，确保 Next.js 能加载 middleware。
 */

const PC_TO_MOBILE: Record<string, string> = {
  "/": "/m",
  "/login": "/m/login",
  "/password": "/m/password",
  "/settings": "/m/settings",
  "/admin/users": "/m/admin/users",
};

const MOBILE_TO_PC: Record<string, string> = {
  "/m": "/",
  "/m/login": "/login",
  "/m/password": "/password",
  "/m/settings": "/settings",
  "/m/admin/users": "/admin/users",
};

const PROTECTED_PC_PATHS = new Set(["/", "/password", "/settings", "/admin/users"]);
const PROTECTED_MOBILE_PATHS = new Set(["/m", "/m/password", "/m/settings", "/m/admin/users"]);

/**
 * 功能：判断请求是否来自移动设备。
 * 入参：req - Next.js 请求对象。
 * 出参：移动设备返回 true，否则返回 false。
 * 异常：无显式抛出；缺少请求头时按 PC 处理。
 * 示例：isMobileRequest(req)。
 */
function isMobileRequest(req: NextRequest) {
  const clientHint = req.headers.get("sec-ch-ua-mobile");
  if (clientHint === "?1") return true;

  const platformHint = req.headers.get("sec-ch-ua-platform") || "";
  if (/Android|iOS/i.test(platformHint)) return true;

  const ua = req.headers.get("user-agent") || "";
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini|webOS|Silk/i.test(ua);
}

/**
 * 功能：判断路径是否需要跳过设备跳转。
 * 入参：pathname - 当前请求路径。
 * 出参：需要跳过返回 true，否则返回 false。
 * 异常：无。
 * 示例：shouldSkipPath("/api/models")。
 */
function shouldSkipPath(pathname: string) {
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(pathname);
}

/**
 * 功能：判断请求是否带有登录 Cookie。
 * 入参：req - Next.js 请求对象。
 * 出参：存在 arena_token 返回 true，否则返回 false。
 * 异常：无；middleware 只做轻量存在性判断，真实鉴权仍由 API 和页面完成。
 * 示例：hasAuthCookie(req)。
 */
function hasAuthCookie(req: NextRequest) {
  return Boolean(req.cookies.get("arena_token")?.value);
}

/**
 * 功能：拦截页面请求并按设备类型跳转到对应 UI 路由。
 * 入参：req - Next.js 请求对象。
 * 出参：跳转响应或继续响应。
 * 异常：无显式抛出；未知路径不跳转。
 * 示例：Next.js 自动调用 middleware(req)。
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (shouldSkipPath(pathname)) return NextResponse.next();

  const mobile = isMobileRequest(req);
  const authed = hasAuthCookie(req);

  if (mobile && !authed && PROTECTED_PC_PATHS.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/m/login";
    return NextResponse.redirect(url);
  }

  if (!mobile && !authed && PROTECTED_MOBILE_PATHS.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const target = mobile ? PC_TO_MOBILE[pathname] : MOBILE_TO_PC[pathname];
  if (!target) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = target;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
