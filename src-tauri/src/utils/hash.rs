/// 哈希计算工具
use md5::{Md5, Digest};

pub fn calculate_md5(data: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}
