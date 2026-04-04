export default function handler(req, res) {
  const user = JSON.parse(req.body);

  if(user.email && user.password) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid" });
  }
}